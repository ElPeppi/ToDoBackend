import type { Request, Response } from "express";
import {
  getUserByEmail,
  updateUser,
  getUserByName,
  getUserForGroup,
  getUploadUrlFromLambda,
   updateMyPhoto,
   getProfilePhoto,
} from "./users.service";

export const getUserByEmailController = async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    const user = await getUserByEmail(email);

    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
    return res.json(user);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error al obtener usuario" });
  }
};

export const getUserByNameController = async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const user = await getUserByName(name);

    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
    return res.json(user);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error al obtener usuario" });
  }
};

export const getUserForGroupController = async (req: Request, res: Response) => {
  try {
    const startsWith = String(req.query.startsWith ?? "").trim();
    if (!startsWith) return res.status(400).json({ message: "startsWith es requerido" });

    const users = await getUserForGroup(startsWith);
    return res.json(users);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error al buscar usuarios" });
  }
};

export const updateUserController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "No autorizado" });

    const { username, email } = req.body as { username?: string; email?: string };

    await updateUser(userId, { username, email });
    return res.json({ message: "Usuario actualizado correctamente" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error al actualizar usuario" });
  }
};

export const getProfilePhotoController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: "No autorizado" });
    const photoUrl = await getProfilePhoto(userId);
    return res.json({ photoUrl });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Error obteniendo foto de perfil" });
  }
};

export const getProfilePhotoUploadUrlController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id; // <-- debe venir de verifyToken
    if (!userId) return res.status(401).json({ message: "No autorizado" });

    const { contentType } = req.body as { contentType?: string };
    if (!contentType) return res.status(400).json({ message: "Falta contentType" });

    const data = await getUploadUrlFromLambda({ userId, contentType });
    return res.json(data); // { uploadUrl, key, ... } lo que devuelva tu lambda
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Error generando upload url" });
  }
};

export const updateMyPhotoController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: "No autorizado" });

    const { photoUrl, key } = req.body as { photoUrl?: string; key?: string };
    if (!photoUrl && !key) return res.status(400).json({ message: "Debes enviar photoUrl o key" });

    const updated = await updateMyPhoto({ userId, photoUrl, key });
    return res.json(updated);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Error actualizando foto" });
  }
};
