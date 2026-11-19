import api from '@/services/apiClient';
import type { InteriorChangeRequest, InteriorDesigner, InteriorPaymentMilestone, InteriorProject, InteriorQuote, SavedInspiration } from '@/types/interiors';

const root='/service-platform/interiors';
export const interiorsMarketplaceService={
  designers: async()=> (await api.get<InteriorDesigner[]>(`${root}/designers`)).data,
  savedDesigners: async()=> (await api.get<InteriorDesigner[]>(`${root}/designers/saved`)).data,
  saveDesigner: async(id:number)=>api.post(`${root}/designers/${id}/save`),
  removeDesigner: async(id:number)=>api.delete(`${root}/designers/${id}/save`),
  projects: async()=> (await api.get<InteriorProject[]>(`${root}/projects/my`)).data,
  project: async(id:number)=> (await api.get<InteriorProject>(`${root}/projects/${id}`)).data,
  createProject: async(input:Record<string,unknown>)=> (await api.post<InteriorProject>(`${root}/projects`,input)).data,
  inspirations: async()=> (await api.get<SavedInspiration[]>(`${root}/inspirations`)).data,
  saveInspiration: async(input:Partial<SavedInspiration>&{sourceUrl:string})=> (await api.post<SavedInspiration>(`${root}/inspirations`,input)).data,
  removeInspiration: async(id:number)=>api.delete(`${root}/inspirations/${id}`),
  acceptQuote: async(projectId:number,quoteId:number)=> (await api.post<InteriorProject>(`${root}/projects/${projectId}/quotes/${quoteId}/accept`)).data,
  changeRequests: async(projectId:number)=> (await api.get<InteriorChangeRequest[]>(`${root}/projects/${projectId}/change-requests`)).data,
  createChange: async(projectId:number,input:Record<string,unknown>)=> (await api.post<InteriorChangeRequest>(`${root}/projects/${projectId}/change-requests`,input)).data,
  decideChange: async(projectId:number,id:number,decision:'APPROVED'|'REJECTED',note?:string)=> (await api.post<InteriorChangeRequest>(`${root}/projects/${projectId}/change-requests/${id}/decision`,{decision,note})).data,
  paymentSchedule: async(projectId:number)=> (await api.get<InteriorPaymentMilestone[]>(`${root}/projects/${projectId}/payment-schedule`)).data,
  addPaymentMilestone: async(projectId:number,input:Record<string,unknown>)=> (await api.post<InteriorPaymentMilestone>(`${root}/projects/${projectId}/payment-schedule`,input)).data,
  createMilestoneCheckout: async(projectId:number,id:number)=> (await api.post<{gateway:string;orderId:string;amount:number;currency:string;paymentSessionId?:string;appId?:string;razorpayKeyId?:string}>(`${root}/projects/${projectId}/payment-schedule/${id}/checkout`)).data,
  authorizeMilestone: async(projectId:number,id:number,gateway:string,orderId:string,paymentId?:string)=> (await api.post(`${root}/projects/${projectId}/payment-schedule/${id}/authorize`,{gateway,orderId,paymentId})).data,
  releaseMilestone: async(projectId:number,id:number,payoutReference?:string)=> (await api.post(`${root}/projects/${projectId}/payment-schedule/${id}/release`,{payoutReference})).data,
  linkInvoice: async(projectId:number,id:number,invoiceReference:string,invoiceUrl?:string)=> (await api.put(`${root}/projects/${projectId}/payment-schedule/${id}/invoice`,{invoiceReference,invoiceUrl})).data,
  checkoutBoq: async(projectId:number)=> (await api.post(`${root}/projects/${projectId}/materials/checkout-boq`)).data,
  myCredentials: async()=> (await api.get(`${root}/providers/me/credentials`)).data,
  submitCredential: async(input:Record<string,unknown>)=> (await api.post(`${root}/providers/me/credentials`,input)).data,
  credentialAudit: async(id:number)=> (await api.get(`${root}/providers/me/credentials/${id}/audit`)).data,
  uploadCredentialEvidence: async(uri:string,name:string,type:string,providerId:number,communityId:number)=>{
    const form=new FormData();
    form.append('file',{uri,name,type} as any);
    form.append('request',new Blob([JSON.stringify({module:'INTERIORS',moduleId:String(providerId),communityId,subContext:'provider-credential'})],{type:'application/json'}) as any);
    return (await api.post('/media/upload',form,{headers:{'Content-Type':'multipart/form-data'}})).data;
  },
};
