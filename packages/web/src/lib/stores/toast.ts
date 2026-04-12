import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
	id: number;
	type: ToastType;
	message: string;
}

let toastId = 0;

function createToastStore() {
	const { subscribe, update } = writable<Toast[]>([]);

	function addToast(type: ToastType, message: string, duration = 5000) {
		const id = ++toastId;
		update((toasts) => [...toasts, { id, type, message }]);

		if (duration > 0) {
			setTimeout(() => {
				removeToast(id);
			}, duration);
		}

		return id;
	}

	function removeToast(id: number) {
		update((toasts) => toasts.filter((t) => t.id !== id));
	}

	return {
		subscribe,
		success: (message: string, duration?: number) => addToast('success', message, duration),
		error: (message: string, duration?: number) => addToast('error', message, duration),
		warning: (message: string, duration?: number) => addToast('warning', message, duration),
		info: (message: string, duration?: number) => addToast('info', message, duration),
		remove: removeToast
	};
}

export const toast = createToastStore();
