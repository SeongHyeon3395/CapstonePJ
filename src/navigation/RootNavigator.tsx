import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { DetailScreen } from '../screens/DetailScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#EFE9D8',
    card: '#EFE9D8',
    text: '#1D1A15',
    border: '#D9D5C7',
    primary: '#8B2E20',
  },
};

export function RootNavigator() {
  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: { backgroundColor: '#EFE9D8' },
          headerTitleStyle: { fontWeight: '800', color: '#1D1A15' },
          contentStyle: { backgroundColor: '#EFE9D8' },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Spectrum' }} />
        <Stack.Screen name="Detail" component={DetailScreen} options={{ title: '이슈 상세' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
