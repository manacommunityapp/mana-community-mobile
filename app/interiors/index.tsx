import React,{useCallback,useEffect,useState} from 'react';
import {ActivityIndicator,Alert,ScrollView,Text,TextInput,TouchableOpacity,View} from 'react-native';
import {useRouter} from 'expo-router';
import {interiorsMarketplaceService as service} from '@/services/interiorsMarketplaceService';
import type {InteriorDesigner,InteriorProject,SavedInspiration} from '@/types/interiors';

export default function InteriorsHome(){
  const router=useRouter(); const [projects,setProjects]=useState<InteriorProject[]>([]); const [designers,setDesigners]=useState<InteriorDesigner[]>([]); const [ideas,setIdeas]=useState<SavedInspiration[]>([]);
  const [busy,setBusy]=useState(true); const [title,setTitle]=useState(''); const [scope,setScope]=useState(''); const [locality,setLocality]=useState(''); const [ideaUrl,setIdeaUrl]=useState('');
  const load=useCallback(async()=>{try{const [p,d,i]=await Promise.all([service.projects(),service.designers(),service.inspirations()]);setProjects(p);setDesigners(d);setIdeas(i);}catch(e:any){Alert.alert('Interiors',e?.response?.data?.message||'Could not load interiors.');}finally{setBusy(false);}},[]);
  useEffect(()=>{load();},[load]);
  const create=async()=>{if(!title.trim()||!scope.trim()||!locality.trim()){Alert.alert('Project brief','Add a title, locality, and scope.');return;}try{const p=await service.createProject({propertyType:'APARTMENT',homeSize:'2BHK',locality,stylePreference:'CONTEMPORARY',focusAreas:[],projectScope:scope});setTitle('');setScope('');await load();router.push(`/interiors/${p.id}` as any);}catch(e:any){Alert.alert('Could not create project',e?.response?.data?.message||'Try again.');}};
  const saveIdea=async()=>{if(!ideaUrl.trim())return;try{await service.saveInspiration({sourceUrl:ideaUrl.trim()});setIdeaUrl('');await load();}catch(e:any){Alert.alert('Could not save idea',e?.response?.data?.message||'Try again.');}};
  if(busy)return <ActivityIndicator style={{flex:1}} size="large" color="#4F46E5"/>;
  const button={backgroundColor:'#4F46E5',padding:12,borderRadius:10,alignItems:'center' as const,marginTop:8};
  const input={backgroundColor:'#fff',borderWidth:1,borderColor:'#CBD5E1',borderRadius:10,padding:11,marginTop:8};
  return <ScrollView style={{flex:1,backgroundColor:'#F8FAFC'}} contentContainerStyle={{padding:18,paddingBottom:40}}>
    <Text style={{fontSize:26,fontWeight:'800',color:'#172554'}}>Interiors & Renovation</Text><Text style={{color:'#64748B',marginTop:4}}>Find designers, manage proposals, and keep project ideas in your account.</Text>
    <Text style={{fontSize:19,fontWeight:'700',marginTop:22}}>Start a project brief</Text>
    <TextInput style={input} placeholder="Project name" value={title} onChangeText={setTitle}/><TextInput style={input} placeholder="Locality" value={locality} onChangeText={setLocality}/><TextInput style={[input,{height:84,textAlignVertical:'top'}]} multiline placeholder="Describe the project scope" value={scope} onChangeText={setScope}/>
    <TouchableOpacity style={button} onPress={create}><Text style={{color:'#fff',fontWeight:'700'}}>Create brief</Text></TouchableOpacity>
    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:24}}><Text style={{fontSize:19,fontWeight:'700'}}>Your projects</Text><TouchableOpacity onPress={()=>router.push('/interiors/credentials' as any)}><Text style={{color:'#4F46E5'}}>Provider credentials</Text></TouchableOpacity></View>
    {projects.map(p=><TouchableOpacity key={p.id} onPress={()=>router.push(`/interiors/${p.id}` as any)} style={{backgroundColor:'#fff',padding:14,borderRadius:12,marginTop:9,borderWidth:1,borderColor:'#E2E8F0'}}><Text style={{fontWeight:'700',fontSize:16}}>{p.title}</Text><Text style={{color:'#64748B',marginTop:4}}>{p.locality} · {p.status} · {p.quotes?.length||0} quotes</Text></TouchableOpacity>)}
    <Text style={{fontSize:19,fontWeight:'700',marginTop:24}}>Verified designers</Text>
    {designers.map(d=><View key={d.id} style={{backgroundColor:'#fff',padding:14,borderRadius:12,marginTop:9,borderWidth:1,borderColor:'#E2E8F0'}}><Text style={{fontWeight:'700'}}>{d.businessName||d.userName||'Interior designer'}</Text><Text style={{color:'#64748B',marginTop:3}}>{d.verifiedCredentialLevel?`${d.verifiedCredentialLevel} credential · `:''}{d.avgRating?`${d.avgRating} rating`:d.verificationStatus}</Text><TouchableOpacity onPress={async()=>{try{await service.saveDesigner(d.id);Alert.alert('Saved','Designer added to your saved list.');}catch{Alert.alert('Could not save designer');}}} style={{marginTop:8}}><Text style={{color:'#4F46E5',fontWeight:'700'}}>Save designer</Text></TouchableOpacity></View>)}
    <Text style={{fontSize:19,fontWeight:'700',marginTop:24}}>Saved inspiration</Text><TextInput style={input} placeholder="Paste an inspiration link" value={ideaUrl} onChangeText={setIdeaUrl}/><TouchableOpacity style={button} onPress={saveIdea}><Text style={{color:'#fff',fontWeight:'700'}}>Save idea to account</Text></TouchableOpacity>
    {ideas.map(i=><View key={i.id} style={{backgroundColor:'#fff',padding:12,borderRadius:10,marginTop:8,flexDirection:'row',justifyContent:'space-between'}}><Text numberOfLines={2} style={{flex:1,color:'#334155'}}>{i.title||i.sourceUrl}</Text><TouchableOpacity onPress={async()=>{await service.removeInspiration(i.id);await load();}}><Text style={{color:'#DC2626',marginLeft:10}}>Remove</Text></TouchableOpacity></View>)}
  </ScrollView>;
}
