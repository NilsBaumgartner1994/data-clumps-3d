// types/global.d.ts
export {};

declare global {
	interface Window {
		xrdevice: any; // You can replace 'any' with a more specific type if possible
	}
}
