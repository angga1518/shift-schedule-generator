"use client"

import { useState, useEffect } from "react"
import type { Config, SpecialDate } from "@/types"
import { se } from "date-fns/locale"

const CONFIG_STORAGE_KEY = "schedule-generator-config"

// Get next month as default
export const getDefaultMonth = () => {
  const nextMonth = new Date()
  nextMonth.setMonth(nextMonth.getMonth() + 1)
  return nextMonth.toISOString().slice(0, 7) // YYYY-MM format
}

export function useConfig() {
  const [config, setConfig] = useState<Config>({
    month: "", // set to empty string initially
    publicHolidays: [],
    specialDates: [],
    maxNightShifts: 9,
    maxDefaultLeaves: 10,
  });

  useEffect(() => {
    if (!config.month) {
      setConfig((prev) => ({ ...prev, month: getDefaultMonth() }));

      try {
        const savedConfig = window.localStorage.getItem(CONFIG_STORAGE_KEY)
        return savedConfig
          ? setConfig(JSON.parse(savedConfig))
          : setConfig({
            month: getDefaultMonth(),
            publicHolidays: [],
            specialDates: [],
            maxNightShifts: 9,
            maxDefaultLeaves: 10,
          })
      } catch (error) {
        console.error("Failed to load config from localStorage", error)
        return setConfig({
          month: getDefaultMonth(),
          publicHolidays: [],
          specialDates: [],
          maxNightShifts: 9,
          maxDefaultLeaves: 10,
        })
      }
    }

  }, [config.month]);

  useEffect(() => {
    try {
      window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config))
    } catch (error) {
      console.error("Failed to save config to localStorage", error)
    }
  }, [config])

  const [specialDateForm, setSpecialDateForm] = useState({
    date: "",
    P: "",
    S: "",
    M: "",
  })

  const addSpecialDate = () => {
    if (specialDateForm.date && specialDateForm.P && specialDateForm.S && specialDateForm.M) {
      const newSpecialDate: SpecialDate = {
        id: Date.now().toString(),
        date: specialDateForm.date,
        P: Number.parseInt(specialDateForm.P),
        S: Number.parseInt(specialDateForm.S),
        M: Number.parseInt(specialDateForm.M),
      }

      setConfig({
        ...config,
        specialDates: [...config.specialDates, newSpecialDate],
      })

      // Reset form
      setSpecialDateForm({
        date: "",
        P: "",
        S: "",
        M: "",
      })
    }
  }

  const removeSpecialDate = (id: string) => {
    setConfig({
      ...config,
      specialDates: config.specialDates.filter((sd) => sd.id !== id),
    })
  }

  return {
    config,
    setConfig,
    specialDateForm,
    setSpecialDateForm,
    addSpecialDate,
    removeSpecialDate,
  }
}