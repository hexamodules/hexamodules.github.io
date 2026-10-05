// Public display settings, maintained by Hexa. No credentials or customer data.
// Register real dealers here after their logo and enquiry destination are confirmed.
// Query parameters select an existing profile; they cannot supply a logo or recipient.
export const DEALERS = Object.freeze([
 Object.freeze({id:'test-hexa',name:'テスト取扱店(Hexa)',logo:'assets/hexa-logo.jpg',listed:false,installation:true,dealerOptions:Object.freeze({electrical:true,ac:true,heater:true,insulation:true}),locations:Object.freeze(['jp']),defaultLocation:'jp'}),
 Object.freeze({id:'sample-a',name:'DEALER A',logo:'assets/dealers/sample-a.svg',demo:true,demoGroup:'sample-a',installation:true,dealerOptions:Object.freeze({electrical:true,ac:true,heater:true,insulation:true}),locations:Object.freeze(['jp']),defaultLocation:'jp'}),
 Object.freeze({id:'sample-b',name:'DEALER B',logo:'assets/dealers/sample-b.svg',demo:true,demoGroup:'sample-b',locations:Object.freeze(['jp']),defaultLocation:'jp'}),
 // Alternate, registered profiles let the manufacturer preview the Australian setup.
 Object.freeze({id:'sample-a-au',name:'DEALER A',logo:'assets/dealers/sample-a.svg',demo:true,demoGroup:'sample-a',locations:Object.freeze(['au']),defaultLocation:'au'}),
 Object.freeze({id:'sample-b-au',name:'DEALER B',logo:'assets/dealers/sample-b.svg',demo:true,demoGroup:'sample-b',locations:Object.freeze(['au']),defaultLocation:'au'})
]);
