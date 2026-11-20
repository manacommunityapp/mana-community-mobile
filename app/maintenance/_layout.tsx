import React from 'react';
import { Stack } from 'expo-router';

export default function MaintenanceLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="generator" />
      <Stack.Screen name="water" />
    </Stack>
  );
}
