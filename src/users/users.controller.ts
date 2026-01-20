import type { Request, Response } from "express";
import {
  getUserByEmail,
  updateUser,
  getUserByName,
  getUserForGroup,
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
