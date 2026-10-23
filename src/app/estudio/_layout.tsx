import { Stack } from 'expo-router';
import { colors } from '../../theme';
export default function EstudioLayout(){return <Stack screenOptions={{headerTintColor:colors.white,headerStyle:{backgroundColor:colors.primary},headerShadowVisible:false,contentStyle:{backgroundColor:colors.canvas},headerTitleStyle:{fontSize:15}}}><Stack.Screen name="flashcards" options={{title:'Tu repaso'}}/><Stack.Screen name="leccion" options={{title:'Tu espacio de estudio'}}/><Stack.Screen name="practica" options={{title:'Práctica libre'}}/></Stack>;}
