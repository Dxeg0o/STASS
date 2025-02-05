import { connectDb } from "@/lib/mongodb";
import { NextResponse, NextRequest } from "next/server";
import Etiqueta from "@/models/tags";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  await connectDb();
  const { id } = params;
  const data = await request.json();

  // Si se envía "subetiqueta", se agrega al array "valores"
  if (data.subetiqueta) {
    try {
      const updatedEtiqueta = await Etiqueta.findByIdAndUpdate(
        id,
        { $push: { valores: data.subetiqueta } },
        { new: true }
      );
      if (!updatedEtiqueta) {
        return NextResponse.json(
          { error: "Etiqueta no encontrada" },
          { status: 404 }
        );
      }
      return NextResponse.json(updatedEtiqueta);
    } catch (error) {
      console.error(error);
      return NextResponse.json(
        { error: "Error al agregar la subetiqueta" },
        { status: 500 }
      );
    }
  }

  // Si se envía "removeSubetiqueta", se elimina del array "valores"
  if (data.removeSubetiqueta) {
    try {
      const updatedEtiqueta = await Etiqueta.findByIdAndUpdate(
        id,
        { $pull: { valores: data.removeSubetiqueta } },
        { new: true }
      );
      if (!updatedEtiqueta) {
        return NextResponse.json(
          { error: "Etiqueta no encontrada" },
          { status: 404 }
        );
      }
      return NextResponse.json(updatedEtiqueta);
    } catch (error) {
      console.error(error);
      return NextResponse.json(
        { error: "Error al eliminar la subetiqueta" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    { error: "Operación no especificada" },
    { status: 400 }
  );
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  await connectDb();
  const { id } = params;

  try {
    const deletedEtiqueta = await Etiqueta.findByIdAndDelete(id);
    if (!deletedEtiqueta) {
      return NextResponse.json(
        { error: "Etiqueta no encontrada" },
        { status: 404 }
      );
    }
    return NextResponse.json({
      message: "Etiqueta eliminada correctamente",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error al eliminar la etiqueta" },
      { status: 500 }
    );
  }
}
