import * as doctorService from "./doctors.service.js";
import { ApiError } from "../../utils/ApiError.js";

export async function getDoctors(req, res, next) {
  try {
    res.status(200).json({ success: true, data: await doctorService.getDoctorsList(req.supabase, req.query, req.profile) });
  } catch (err) { next(err); }
}

export async function getDoctor(req, res, next) {
  try {
    res.status(200).json({ success: true, data: await doctorService.getDoctorById(req.params.id, req.supabase, req.profile) });
  } catch (err) { next(err); }
}

export async function createDoctor(req, res, next) {
  try {
    const doctor = await doctorService.createDoctor(req.body, req.supabase);
    res.status(201).json({ success: true, message: "Dokter berhasil ditambahkan.", data: doctor });
  } catch (err) { next(err); }
}

export async function updateDoctor(req, res, next) {
  try {
    if (req.profile.role !== "admin" && req.user.id !== req.params.id) {
      throw ApiError.forbidden("Anda hanya boleh mengubah profil Anda sendiri.");
    }
    const updated = await doctorService.updateDoctor(req.params.id, req.body, req.supabase, req.profile);
    res.status(200).json({ success: true, message: "Data dokter berhasil diperbarui.", data: updated });
  } catch (err) { next(err); }
}

export async function deleteDoctor(req, res, next) {
  try {
    const result = await doctorService.deleteDoctor(req.params.id, req.supabase);
    res.status(200).json({ success: true, message: result.message });
  } catch (err) { next(err); }
}

export async function uploadPhoto(req, res, next) {
  try {
    const doctor = await doctorService.setDoctorPhoto(req.params.id,
      { buffer: req.body, contentType: req.headers["content-type"] }, req.supabase);
    res.status(200).json({ success: true, message: "Foto dokter berhasil disimpan.", data: doctor });
  } catch (err) { next(err); }
}

export async function deletePhoto(req, res, next) {
  try {
    const doctor = await doctorService.removeDoctorPhoto(req.params.id, req.supabase);
    res.status(200).json({ success: true, message: "Foto dokter dihapus.", data: doctor });
  } catch (err) { next(err); }
}
