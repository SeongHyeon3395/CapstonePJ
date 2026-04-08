import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@react-native-vector-icons/ionicons';
import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';

export type TabParamList = {
  Home: undefined;
  History: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#9CA3AF',
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          const iconMap: Record<string, string> = {
            Home: 'home-outline',
            History: 'search-outline',
            Settings: 'person-outline',
          };

          return <Ionicons name={iconMap[route.name] || 'ellipse-outline'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ title: '뉴스 분석' }}
      />
      <Tab.Screen 
        name="History" 
        component={HistoryScreen}
        options={{ title: '분석 기록' }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ title: '설정' }}
      />
    </Tab.Navigator>
  );
}
