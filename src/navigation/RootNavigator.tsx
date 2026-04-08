import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TabNavigator from './TabNavigator';
import DetailScreen from '../screens/DetailScreen';

export type RootStackParamList = {
  Main: undefined;
  Detail: { keyword: string; articleId?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen 
        name="Detail" 
        component={DetailScreen}
        options={{
          headerShown: true,
          headerTitle: '기사 분석',
        }}
      />
    </Stack.Navigator>
  );
}
