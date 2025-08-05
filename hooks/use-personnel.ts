"use client"

import { useState, useEffect } from "react"
import type { Personnel } from "@/types"

const PERSONNEL_STORAGE_KEY = "schedule-generator-personnel"

export function usePersonnel() {
  const [personnel, setPersonnel] = useState<Personnel[]>(() => {
    if (typeof window === "undefined") {
      return [{ id: 1, name: "Andi", role: "shift", requestedLeaves: [], requestedExtraLeaves: [], requestedAnnualLeaves: [] }]
    }
    try {
      const savedPersonnel = window.localStorage.getItem(PERSONNEL_STORAGE_KEY)
      return savedPersonnel
        ? JSON.parse(savedPersonnel)
        : [{ id: 1, name: "Andi", role: "shift", requestedLeaves: [], requestedExtraLeaves: [], requestedAnnualLeaves: [] }]
    } catch (error) {
      console.error("Failed to load personnel from localStorage", error)
      return [{ id: 1, name: "Andi", role: "shift", requestedLeaves: [], requestedExtraLeaves: [], requestedAnnualLeaves: [] }]
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(PERSONNEL_STORAGE_KEY, JSON.stringify(personnel))
    } catch (error) {
      console.error("Failed to save personnel to localStorage", error)
    }
  }, [personnel])


  const addPersonnel = () => {
    const newId = personnel.length > 0 ? Math.max(...personnel.map((p) => p.id)) + 1 : 1
    setPersonnel([
      ...personnel,
      {
        id: newId,
        name: "",
        role: "shift",
        requestedLeaves: [],
        requestedExtraLeaves: [],
        requestedAnnualLeaves: [],
      },
    ])
  }

  const removePersonnel = (id: number) => {
    setPersonnel(personnel.filter((p) => p.id !== id))
  }

  const updatePersonnel = (id: number, field: keyof Personnel, value: any) => {
    setPersonnel(personnel.map((p) => (p.id === id ? { ...p, [field]: value } : p)))
  }

  return {
    personnel,
    setPersonnel,
    addPersonnel,
    removePersonnel,
    updatePersonnel,
  }
}