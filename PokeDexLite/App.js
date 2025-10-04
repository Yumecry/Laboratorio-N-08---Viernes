// PokeDexLite - App.js
// Single-file Expo + React Native app demonstrating:
// - axios for API calls
// - useState/useEffect
// - FlatList with pagination and pull-to-refresh
// - simple Settings context to change page size

import React, {useState, useEffect, useCallback, createContext, useContext} from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Button,
  Pressable,
  Alert,
  StyleSheet,
  Switch
} from 'react-native';
import axios from 'axios';

// --- Settings Context ---
const SettingsContext = createContext();

function useSettings(){
  return useContext(SettingsContext);
}

// --- Home (Pokemons List) ---
function HomeScreen({ navigation }){
  const { pageSize, setPageSize } = useSettings();
  const [pokemons, setPokemons] = useState([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [hasNext, setHasNext] = useState(true);
  const [reloadKey, setReloadKey] = useState(0); // to force reload when pageSize changes

  const baseUrl = 'https://pokeapi.co/api/v2/pokemon';

  const fetchPage = useCallback(async (currentOffset, replace=false) =>{
    if (!hasNext && !replace) return;
    try{
      if (replace) setLoading(true);
      else if (currentOffset === 0) setLoading(true);
      else setLoadingMore(true);

      setError(null);
      const res = await axios.get(baseUrl, {
        params: { limit: pageSize, offset: currentOffset }
      });

      const results = res.data.results || [];
      if (replace) setPokemons(results);
      else setPokemons(prev => currentOffset === 0 ? results : [...prev, ...results]);

      // pokeapi indicates next as url or null
      setHasNext(Boolean(res.data.next));

    }catch(e){
      console.error(e);
      setError('No se pudieron cargar Pokémon.');
    }finally{
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [pageSize, hasNext]);

  // initial load and when pageSize or reloadKey changes
  useEffect(()=>{
    setOffset(0);
    setHasNext(true);
    fetchPage(0, true);
  }, [pageSize, reloadKey]);

  const loadMore = ()=>{
    if (loadingMore || loading) return;
    if (!hasNext) return;
    const nextOffset = offset + pageSize;
    setOffset(nextOffset);
    fetchPage(nextOffset);
  };

  const onRefresh = ()=>{
    setRefreshing(true);
    setOffset(0);
    setHasNext(true);
    fetchPage(0, true);
  };

  const renderItem = ({item})=> (
    <TouchableOpacity style={styles.item} onPress={()=> navigation.navigate('DetallePokemon', { url: item.url, name: item.name })}>
      <Text style={styles.itemText}>{item.name}</Text>
      <Text style={styles.itemUrl}>{item.url}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>PokeDex Lite</Text>
        <Button title="Settings" onPress={()=> navigation.navigate('Settings')} />
      </View>

      {loading && pokemons.length === 0 ? (
        <View style={styles.center}><ActivityIndicator size="large" /></View>
      ) : error ? (
        <View style={styles.center}>
          <Text>{error}</Text>
          <Button title="Reintentar" onPress={()=> fetchPage(0, true)} />
        </View>
      ) : pokemons.length === 0 ? (
        <View style={styles.center}><Text>Lista vacía.</Text></View>
      ) : (
        <FlatList
          data={pokemons}
          keyExtractor={(item)=> item.name }
          renderItem={renderItem}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={()=> (
            loadingMore ? <ActivityIndicator style={{margin:12}} /> : !hasNext ? <Text style={{textAlign:'center', padding:8}}>No hay más Pokémon.</Text> : null
          )}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      )}
    </SafeAreaView>
  );
}

// --- Detail Screen ---
function DetallePokemon({ route }){
  const { url, name } = route.params;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(()=>{
    let mounted = true;
    async function load(){
      try{
        setLoading(true);
        const res = await axios.get(url);
        if (mounted) setData(res.data);
      }catch(e){
        console.error(e);
        if (mounted) setError('Error cargando detalle.');
      }finally{
        if (mounted) setLoading(false);
      }
    }
    load();
    return ()=> mounted = false;
  }, [url]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  if (error) return <View style={styles.center}><Text>{error}</Text></View>;
  if (!data) return null;

  const sprite = data.sprites?.front_default;
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{name}</Text>
      {sprite ? <Image source={{uri: sprite}} style={styles.sprite} /> : <Text>No sprite</Text>}
      <Text>Altura: {data.height}</Text>
      <Text>Peso: {data.weight}</Text>
      <Text>Tipos: {data.types.map(t => t.type.name).join(', ')}</Text>
    </SafeAreaView>
  );
}

// --- Settings ---
function SettingsScreen(){
  const { pageSize, setPageSize, triggerReload } = useSettings();
  const options = [10,20,50];

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Configuración</Text>
      <Text>Pokémon por página</Text>
      {options.map(opt => (
        <Pressable key={opt} style={styles.rowOption} onPress={()=>{ setPageSize(opt); Alert.alert('Guardado', `Mostrando ${opt} por página`); triggerReload(); }}>
          <Text style={{fontSize:16}}>{opt}</Text>
          <Text>{ pageSize === opt ? '✓' : '' }</Text>
        </Pressable>
      ))}
      <View style={{height:20}} />
      <Button title="Forzar recarga en Home" onPress={()=> triggerReload()} />
    </SafeAreaView>
  );
}

// --- App and Navigation ---
const Stack = createNativeStackNavigator();

export default function App(){
  const [pageSize, setPageSize] = useState(20);
  const [reloadKey, setReloadKey] = useState(0);

  const triggerReload = ()=> setReloadKey(k=> k+1);

  return (
    <SettingsContext.Provider value={{ pageSize, setPageSize, reloadKey, triggerReload }}>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Pokemons' }} />
          <Stack.Screen name="DetallePokemon" component={DetallePokemon} options={({route})=>({ title: route.params.name })} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Configuración' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SettingsContext.Provider>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: { flex:1, padding:12 },
  center: { flex:1, justifyContent:'center', alignItems:'center' },
  item: { padding:12, borderBottomWidth:1, borderColor:'#eee' },
  itemText: { fontSize:16, fontWeight:'600' },
  itemUrl: { fontSize:10, color:'#666', marginTop:4 },
  title: { fontSize:20, fontWeight:'700' },
  headerRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8 },
  sprite: { width:120, height:120, resizeMode:'contain', marginVertical:12 },
  rowOption: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:12, borderBottomWidth:1, borderColor:'#eee' }
});
