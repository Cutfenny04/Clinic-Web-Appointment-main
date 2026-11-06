import * as doctorService from "./doctors.service.js";
import { ApiError } from "../../utils/ApiError.js";

export async function getDoctors(req, res, next) {
  try {
    const doctors = await doctorService.getDoctorsList(req.supabase, req.query);
    res.status(200).json({
      success: true,
      data: doctors,
    });
  } catch (err) {
    next(err);
  }
}

export async function getDoctor(req, res, next) {
  try {
    const doctor = await doctorService.getDoctorById(req.params.id, req.supabase);
    res.status(200).json({
      success: true,
      data: doctor,
    });
  } catch (err) {
    next(err);
  }
}

export async function createDoctor(req, res, next) {
  try {
    const doctor = await doctorService.createDoctor(req.body, req.supabase);
    res.status(201).json({
      success: true,
      message: "Dokter berhasil ditambahkan.",
      data: doctor,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateDoctor(req, res, next) {
  try {
    const doctorId = req.params.id;

    // Hanya admin atau dokter itu sendiri yang boleh mengubah profilnya
    if (req.profile.role !== "admin" && req.user.id !== doctorId) {
      throw ApiError.forbidden("Anda hanya boleh mengubah profil Anda sendiri.");
    }

    const updated = await doctorService.updateDoctor(doctorId, req.body, req.supabase);
    res.status(200).json({
      success: true,
      message: "Data dokter berhasil diperbarui.",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteDoctor(req, res, next) {
  try {
    const result = await doctorService.deleteDoctor(req.params.id, req.supabase);
    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
}
