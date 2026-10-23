import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme';
export default function TabsLayout(){
 const insets=useSafeAreaInsets();
 return <Tabs screenOptions={{headerShown:false,tabBarActiveTintColor:colors.primary,tabBarInactiveTintColor:colors.textMuted,tabBarLabelStyle:{fontSize:11,fontWeight:'600'},tabBarStyle:{backgroundColor:colors.white,borderTopColor:colors.line,paddingTop:7,paddingBottom:Math.max(insets.bottom,8),height:60+Math.max(insets.bottom,8)}}}>{([{name:'index',title:'Inicio',icon:'home-outline'},{name:'materiales',title:'Materiales',icon:'folder-open-outline'},{name:'repaso',title:'Repaso',icon:'layers-outline'},{name:'progreso',title:'Progreso',icon:'stats-chart-outline'}] as const).map(tab=><Tabs.Screen key={tab.name} name={tab.name} options={{title:tab.title,tabBarIcon:({color,focused})=><View style={{backgroundColor:focused?colors.successSoft:'transparent',paddingHorizontal:17,paddingVertical:3,borderRadius:20}}><Ionicons name={tab.icon} color={color as string} size={23}/></View>}}/>)}</Tabs>;
}
