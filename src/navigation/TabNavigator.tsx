import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@react-native-vector-icons/ionicons';
import HomeScreen from '../screens/HomeScreen';
import AnalyzeScreen from '../screens/AnalyzeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';

export type TabParamList = {
  Home: undefined;
  Analyze: undefined;
  History: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

export default function TabNavigator() {
  const iconMap: Record<keyof TabParamList, React.ComponentProps<typeof Ionicons>['name']> = {
    Home: 'home-outline',
    Analyze: 'flash-outline',
    History: 'search-outline',
    Settings: 'person-outline',
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#9CA3AF',
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          return <Ionicons name={iconMap[route.name as keyof TabParamList]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ title: '뉴스 분석' }}
      />
      <Tab.Screen
        name="Analyze"
        component={AnalyzeScreen}
        options={{ title: '분석하기' }}
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
