import { useCallback, useEffect, useState } from "react";
import { fetchPatients } from "../services/patientService";

export default function usePatients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadPatients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchPatients();

      setPatients(
        Array.isArray(data)
          ? data
          : data?.patients || []
      );
    } catch (err) {
      console.error(
        "Failed to load patients:",
        err
      );

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load patients"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  return {
    patients,
    loading,
    error,
    refreshPatients: loadPatients,
  };
}