import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TabNavigator from './TabNavigator';
import DetailScreen from '../screens/DetailScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import { useAuthStore } from '../store/authStore';

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  Main: undefined;
  Detail: { keyword: string; articleId?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const user = useAuthStore((state) => state.user);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {!user ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
        </>
      ) : (
        <>
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen 
        name="Detail" 
        component={DetailScreen}
        options={{
          headerShown: true,
          headerTitle: '기사 분석',
        }}
      />
        </>
      )}
    </Stack.Navigator>
  );
}
