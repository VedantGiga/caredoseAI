import { create } from "zustand";

export interface Patient {
  id: string;
  userId: string;
  name: string;
  age: number;
  phone: string;
  language: string;
  createdAt: string;
}

interface PatientState {
  selectedPatientId: string | null;
  setSelectedPatient: (id: string | null) => void;
}

export const usePatientStore = create<PatientState>((set) => ({
  selectedPatientId: null,
  setSelectedPatient: (id) => set({ selectedPatientId: id }),
}));
