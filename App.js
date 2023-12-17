import React, { useState, useEffect } from 'react';
import { TextInput, Button, TouchableOpacity, FlatList, View, Modal, Text, StyleSheet, TouchableWithoutFeedback, Keyboard, Dimensions } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location'; 
import MapView, { Marker } from 'react-native-maps';
import DateTimePicker from '@react-native-community/datetimepicker';

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'EventRater' }} />
        <Stack.Screen name="AddEvent" component={AddEventScreen} options={{ title: 'Add an Event' }} />
        <Stack.Screen name="RateEvent" component={RateEventScreen} options={{ title: 'Rate the Event' }} />
        <Stack.Screen name="EditEvent" component={EditEventScreen} options={{ title: 'Edit the Event' }} />
        <Stack.Screen name="EventDetails" component={EventDetailsScreen} options={{ title: 'Event Details' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const Stack = createStackNavigator();

const HomeScreen = ({ navigation }) => {
  const [events, setEvents] = useState([]);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; 
    return distance;
  };
  

const loadEvents = async () => {
  try {
    const eventsString = await AsyncStorage.getItem('events');
    if (eventsString) {
      const eventsData = JSON.parse(eventsString);

      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const userLocation = await Location.getCurrentPositionAsync({});
        
        
        const sortedEvents = eventsData.map((event) => {
          const { latitude, longitude } = event.locationData;
          const eventLocation = { latitude, longitude };
          const { latitude: lat1, longitude: lon1 } = userLocation.coords;
          const { latitude: lat2, longitude: lon2 } = event.locationData;
          const distance = calculateDistance(lat1, lon1, lat2, lon2);
          return { ...event, distance };
        });

        sortedEvents.sort((a, b) => a.distance - b.distance);
        setEvents(sortedEvents);
      }
    }
  } catch (error) {
    console.error('Error loading events:', error);
  }
};


  
  useFocusEffect(
    React.useCallback(() => {
      loadEvents();
    }, [])
  );

  const handleDelete = async (event) => {
    try {
      const existingEventsString = await AsyncStorage.getItem('events');
      const existingEvents = existingEventsString ? JSON.parse(existingEventsString) : [];
    
      const eventIndex = existingEvents.findIndex((e) => {
        
        return e.id === event.id; 
      });
    
      if (eventIndex !== -1) {
        existingEvents.splice(eventIndex, 1);
        
        
        await AsyncStorage.setItem('events', JSON.stringify(existingEvents));
    
        navigation.navigate('Home');
      }
    } catch (error) {
      console.error('Error deleting the event:', error);
    }
    
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('AddEvent')}
      >
        <Text style={styles.buttonText}>Add Event</Text>
      </TouchableOpacity>

      <FlatList
        data={events}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.eventBox}
            onPress={() => {
              navigation.navigate('EventDetails', { event: item, onDelete: () => handleDelete(item) });
            }}
          >
            <Text style={styles.eventText}>{item.name}</Text>
            <Text style={styles.eventText}>{item.date}</Text>
            <Text style={styles.eventText}>{item.time}</Text>
            <Text style={styles.eventText}>{item.locationName}</Text>
            <Text style={styles.eventText}>
              Average Ratings: {
                ((item.ratings.location +
                item.ratings.entertainment +
                item.ratings.atmosphere +
                item.ratings.prices +
                item.ratings.overall) / 5).toFixed(2)
              }
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const AddEventScreen = ({ navigation, route }) => {
  const [eventName, setEventName] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { event, onDelete } = route.params || {};
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [showDatepicker, setShowDatepicker] = useState(false);
  const [showTimepicker, setShowTimepicker] = useState(false);
 
  const showDatepickerHandler = () => {
    setShowDatepicker(true);
    setShowTimepicker(false);
  };

  const showTimepickerHandler = () => {
    setShowTimepicker(true);
    setShowDatepicker(false);
  };

  const onChangeDate = (event, selected) => {
    const currentDate = selected || selectedDate;
    setShowDatepicker(false);
    setSelectedDate(currentDate);
  };
  

  const onChangeTime = (event, selected) => {
    const currentTime = selected || selectedTime;
    setShowTimepicker(false);
    setSelectedTime(currentTime);
  };
  const getLocationAddress = async (latitude, longitude) => {
    try {
      const apiKey = 'pk.ba4a635ceeda55f550a381c686fb65a3'; 
      const url = `https://us1.locationiq.com/v1/reverse.php?key=${apiKey}&lat=${latitude}&lon=${longitude}&format=json`;
  
      const response = await fetch(url);
      const locationData = await response.json();
  
      
      const address = locationData?.display_name || 'Address not found';
      setSelectedAddress(address);
    } catch (error) {
      console.error('Error getting address:', error);
    }
  };
  
  const handleMapPress = async (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedLocation({ latitude, longitude });
    await getLocationAddress(latitude, longitude);
  };

  const isValidName = (name) => {
    return name.length <= 20;
  };

  const toggleErrorModal = () => {
    setErrorModalVisible(!errorModalVisible);
  };

  const handleCreateEvent = async () => {
    try {
      if (!eventName || !selectedAddress) {
        setErrorMessage('Please fill in all fields.');
        toggleErrorModal();
        return;
      }

      if (!isValidName(eventName)) {
        setErrorMessage('Name must be 20 characters or less.');
        toggleErrorModal();
        return;
      }

      const existingEventsString = await AsyncStorage.getItem('events');
      const existingEvents = existingEventsString ? JSON.parse(existingEventsString) : [];

      const newEvent = {
        id: existingEvents.length + 1,
        name: eventName,
        date: selectedDate.toLocaleDateString(),
        time: selectedTime.toLocaleTimeString(),
        locationName: selectedAddress,
        locationData: selectedLocation,
        ratings: {
          location: 0,
          entertainment: 0,
          atmosphere: 0,
          prices: 0,
          overall: 0,
        },
      };

      const updatedEvents = [...existingEvents, newEvent];

      await AsyncStorage.setItem('events', JSON.stringify(updatedEvents));

      navigation.navigate('Home');
    } catch (error) {
      console.error('Error saving the event:', error);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <TextInput
          style={styles.input}
          placeholder="Name"
          value={eventName}
          onChangeText={(text) => text.length <= 20 && setEventName(text)}
          maxLength={20}
        />

          <View>
          <Button onPress={showDatepickerHandler} title="Show Date Picker" />
          {showDatepicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={onChangeDate}
            />
          )}
        </View>
        <View>
          <Button onPress={showTimepickerHandler} title="Show Time Picker" />
          {showTimepicker && (
            <DateTimePicker
              value={selectedTime}
              mode="time"
              display="default"
              onChange={onChangeTime}
            />
          )}
        </View>
        <MapView
        style={styles.map}
        onPress={handleMapPress}
        initialRegion={{
          latitude: 47.377051,
          longitude:  8.085590,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      >
        {selectedLocation && (
          <Marker coordinate={selectedLocation} />
        )}
      </MapView>
      <View style={styles.addressContainer}>
        <Text>Selected Address:</Text>
        <Text>{selectedAddress}</Text>
      </View>
      <Button title="Save Location" onPress={() => {

      }} />
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleCreateEvent}
        >
          <Text style={styles.buttonText}>Create Event</Text>
        </TouchableOpacity>

        <Modal
          animationType="slide"
          transparent={true}
          visible={errorModalVisible}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalText}>{errorMessage}</Text>
              <Button title="OK" onPress={toggleErrorModal} />
            </View>
          </View>
        </Modal>

        {event && (
          <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
            <Text style={styles.buttonText}>Delete Event</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
};

const EventDetailsScreen = ({ route, navigation }) => {
  const { event, onDelete } = route.params;

  const handleRateEvent = () => {
    navigation.navigate('RateEvent', { event });
  };

  const handleEdit = () => {
    navigation.navigate('EditEvent', { event });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.eventText}>{event.name}</Text>
      <Text style={styles.eventText}>{event.date}</Text>
      <Text style={styles.eventText}>{event.time}</Text>
      <Text style={styles.eventText}>{event.locationName}</Text>
      <Text style={styles.eventText}>
              Average Ratings: {
                ((event.ratings.location +
                  event.ratings.entertainment +
                  event.ratings.atmosphere +
                  event.ratings.prices +
                  event.ratings.overall) / 5).toFixed(2)
              }
            </Text>
      <TouchableOpacity style={styles.button} onPress={handleEdit}>
        <Text>Edit</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={onDelete}>
        <Text>Delete</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={handleRateEvent}>
        <Text>Rate Event</Text>
      </TouchableOpacity>
    </View>
  );
};


const EditEventScreen = ({ navigation, route }) => {
  const [eventName, setEventName] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { event, onDelete } = route.params || {};
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [showDatepicker, setShowDatepicker] = useState(false);
  const [showTimepicker, setShowTimepicker] = useState(false);
 
  const showDatepickerHandler = () => {
    setShowDatepicker(true);
    setShowTimepicker(false);
  };

  const showTimepickerHandler = () => {
    setShowTimepicker(true);
    setShowDatepicker(false);
  };

  const onChangeDate = (event, selected) => {
    const currentDate = selected || selectedDate;
    setShowDatepicker(false);
    setSelectedDate(currentDate);
  };
  

  const onChangeTime = (event, selected) => {
    const currentTime = selected || selectedTime;
    setShowTimepicker(false);
    setSelectedTime(currentTime);
  };
  const getLocationAddress = async (latitude, longitude) => {
    try {
      const apiKey = 'pk.ba4a635ceeda55f550a381c686fb65a3';
      const url = `https://us1.locationiq.com/v1/reverse.php?key=${apiKey}&lat=${latitude}&lon=${longitude}&format=json`;
  
      const response = await fetch(url);
      const locationData = await response.json();
  
      
      const address = locationData?.display_name || 'Address not found';
      setSelectedAddress(address);
    } catch (error) {
      console.error('Error getting address:', error);
    }
  };
  
  const handleMapPress = async (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedLocation({ latitude, longitude });
    await getLocationAddress(latitude, longitude);
  };

  const isValidName = (name) => {
    return name.length <= 20;
  };

  const toggleErrorModal = () => {
    setErrorModalVisible(!errorModalVisible);
  };

  const handleUpdateEvent = async () => {
    try {
      if (!eventName || !selectedAddress) {
        setErrorMessage('Please fill in all fields.');
        toggleErrorModal();
        return;
      }

      

      const updatedEvent = {
        ...event,
        name: eventName,
        date: selectedDate.toLocaleDateString(),
        time: selectedTime.toLocaleTimeString(),
        locationName: selectedAddress,
        locationData: selectedLocation,
        ratings: {
          location: 0,
          entertainment: 0,
          atmosphere: 0,
          prices: 0,
          overall: 0,
        },
      };

      
      const existingEventsString = await AsyncStorage.getItem('events');
      const existingEvents = existingEventsString ? JSON.parse(existingEventsString) : [];

      
      const eventIndex = existingEvents.findIndex((e) => e.id === event.id);

      
      if (eventIndex !== -1) {
        existingEvents[eventIndex] = updatedEvent;

        
        await AsyncStorage.setItem('events', JSON.stringify(existingEvents));

        
        navigation.navigate('EventDetails', { event: updatedEvent });
      } else {
        console.error('Event not found for updating.');
      }
    } catch (error) {
      console.error('Error updating the event:', error);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <TextInput
          style={styles.input}
          placeholder="Name"
          value={eventName}
          onChangeText={(text) => text.length <= 20 && setEventName(text)}
          maxLength={20}
        />

          <View>
          <Button onPress={showDatepickerHandler} title="Show Date Picker" />
          {showDatepicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={onChangeDate}
            />
          )}
        </View>
        <View>
          <Button onPress={showTimepickerHandler} title="Show Time Picker" />
          {showTimepicker && (
            <DateTimePicker
              value={selectedTime}
              mode="time"
              display="default"
              onChange={onChangeTime}
            />
          )}
        </View>
        <MapView
        style={styles.map}
        onPress={handleMapPress}
        initialRegion={{
          latitude: 47.377051,
          longitude:  8.085590,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      >
        {selectedLocation && (
          <Marker coordinate={selectedLocation} />
        )}
      </MapView>
      <View style={styles.addressContainer}>
        <Text>Selected Address:</Text>
        <Text>{selectedAddress}</Text>
      </View>
      <Button title="Save Location" onPress={() => {

      }} />
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleUpdateEvent}
        >
          <Text style={styles.buttonText}>Update Event</Text>
        </TouchableOpacity>

        <Modal
          animationType="slide"
          transparent={true}
          visible={errorModalVisible}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalText}>{errorMessage}</Text>
              <Button title="OK" onPress={toggleErrorModal} />
            </View>
          </View>
        </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
};

const RateEventScreen = ({ route, navigation }) => {
  const { event } = route.params;
  const [ratings, setRatings] = useState({
    location: 0,
    entertainment: 0,
    atmosphere: 0,
    prices: 0,
    overall: 0,
  });

  const handleRateEvent = async () => {
    try {
      console.log(ratings)
      const updatedEvent = {
        ...event,
        ratings: { ...ratings },
      };

      
      const existingEventsString = await AsyncStorage.getItem('events');
      const existingEvents = existingEventsString ? JSON.parse(existingEventsString) : [];

      
      const eventIndex = existingEvents.findIndex((e) => e.id === event.id);

      
      if (eventIndex !== -1) {
        existingEvents[eventIndex] = updatedEvent;

        
        await AsyncStorage.setItem('events', JSON.stringify(existingEvents));

        
        navigation.navigate('Home');
      } else {
        console.error('Event not found for updating ratings.');
      }
    } catch (error) {
      console.error('Error updating event ratings:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.eventName}>{event.name}</Text>
      <Text style={styles.ratingCriteria}>Rate the following aspects from 0 (Poor) to 3 (Excellent):</Text>

      <View style={styles.ratingItem}>
        <Text>Location:</Text>
        <Slider
          style={{ width: 200 }}
          minimumValue={0}
          maximumValue={3}
          step={1}
          value={ratings.location}
          onValueChange={(value) => setRatings({ ...ratings, location: value })}
        />
      </View>
      <View style={styles.ratingItem}>
        <Text>Entertainment:</Text>
        <Slider
          style={{ width: 200 }}
          minimumValue={0}
          maximumValue={3}
          step={1}
          value={ratings.entertainment}
          onValueChange={(value) => setRatings({ ...ratings, entertainment: value })}
        />
      </View>
      <View style={styles.ratingItem}>
        <Text>Atmosphere:</Text>
        <Slider
          style={{ width: 200 }}
          minimumValue={0}
          maximumValue={3}
          step={1}
          value={ratings.atmosphere}
          onValueChange={(value) => setRatings({ ...ratings, atmosphere: value })}
        />
      </View>
      <View style={styles.ratingItem}>
        <Text>Prices:</Text>
        <Slider
          style={{ width: 200 }}
          minimumValue={0}
          maximumValue={3}
          step={1}
          value={ratings.prices}
          onValueChange={(value) => setRatings({ ...ratings, prices: value })}
        />
      </View>
      <View style={styles.ratingItem}>
        <Text>Overall:</Text>
        <Slider
          style={{ width: 200 }}
          minimumValue={0}
          maximumValue={3}
          step={1}
          value={ratings.overall}
          onValueChange={(value) => setRatings({ ...ratings, overall: value })}
        />
      </View>
      <TouchableOpacity style={styles.submitButton} onPress={handleRateEvent}>
        <Text style={styles.submitButtonText}>Submit Ratings</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: '#87CEFA',
    borderColor: '#000080',
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    margin: 10,
  },
  buttonText: {
    color: 'black',
    textAlign: 'center',
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    margin: 10,
    padding: 8,
    width: 200,
    borderRadius: 10,
  },
  map: {
    width: Dimensions.get('window').width * 0.8,
    height: Dimensions.get('window').height * 0.4,
  },
  addressContainer: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalText: {
    marginBottom: 10,
  },
  eventBox: {
    backgroundColor: '#87CEFA',
    borderColor: '#000080',
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    margin: 10,
  },
  eventText: {
    color: 'black',
    textAlign: 'center',
  },
  button: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#87CEFA',
    borderRadius: 5,
  },
  deleteButton: {
    marginTop: 10,
    padding: 10,
    backgroundColor: 'red',
    borderRadius: 5,
  },
});


export default App;
