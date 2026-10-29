import React from "react";
import Modal from "@/components/Modal";
import PatientProfileCard from "@/components/PatientProfileCard";
export default function PatientDetailsModal({
  show,
  onClose,
  patient
}) {
  const prevPatientRef = React.useRef(null);
  if (patient) {
    prevPatientRef.current = patient;
  }
  const displayPatient = patient || prevPatientRef.current;
  return <Modal show={show} onClose={onClose} maxWidth="md">{displayPatient && <div className="max-h-[85vh] overflow-y-auto custom-scrollbar modal-scrollbar"><PatientProfileCard patient={displayPatient} onClose={onClose} /></div>}</Modal>;
}
