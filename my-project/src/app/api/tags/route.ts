import { NextResponse, NextRequest } from "next/server";
import { connectDb } from "@/lib/mongodb";
import Etiqueta from "@/models/tags";
import Subetiqueta from "@/models/subtags";
import mongoose from "mongoose";

export async function GET(request: NextRequest) {
  await connectDb();
  const { searchParams } = new URL(request.url);
  const empresaId = searchParams.get("empresaId");

  let matchQuery = {};
  if (empresaId) {
    matchQuery = { empresaId };
  }

  try {
    // Se realiza un $lookup para unir las subetiquetas asociadas a cada etiqueta
    const tags = await Etiqueta.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: "subetiquetas", // nombre de la colección de Subetiqueta (por defecto, pluralizado)
          localField: "_id",
          foreignField: "etiquetaId",
          as: "subetiquetas",
        },
      },
    ]);
    return NextResponse.json(tags);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error al obtener las etiquetas" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  await connectDb();
  const data = await request.json();

  // Si no se envía _id, lo generamos automáticamente.
  if (!data._id) {
    data._id = new mongoose.Types.ObjectId().toString();
  }

  // Eliminamos "valores" si viene, ya que no se utiliza en la nueva estructura
  delete data.valores;

  try {
    const tag = await Etiqueta.create(data);
    return NextResponse.json(tag);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error al crear la etiqueta" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  await connectDb();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Falta el id de la etiqueta a eliminar" },
      { status: 400 }
    );
  }

  try {
    const deletedTag = await Etiqueta.findByIdAndDelete(id);

    if (!deletedTag) {
      return NextResponse.json(
        { error: "Etiqueta no encontrada" },
        { status: 404 }
      );
    }

    // También se eliminan todas las subetiquetas asociadas a la etiqueta eliminada
    await Subetiqueta.deleteMany({ etiquetaId: id });

    return NextResponse.json({
      message: "Etiqueta y sus subetiquetas eliminadas exitosamente",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error al eliminar la etiqueta" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  await connectDb();

  const { searchParams } = new URL(request.url);
  const queryId = searchParams.get("id");

  const data = await request.json();
  const id = data._id || queryId;

  if (!id) {
    return NextResponse.json(
      { error: "Falta el id de la etiqueta a actualizar" },
      { status: 400 }
    );
  }

  try {
    // Si se envía "subetiqueta", se crea una nueva subetiqueta asociada a la etiqueta indicada
    if (data.subetiqueta) {
      const newSubetiqueta = {
        _id: new mongoose.Types.ObjectId().toString(),
        etiquetaId: id,
        valor: data.subetiqueta,
        fechaCreacion: new Date(),
      };
      const createdSub = await Subetiqueta.create(newSubetiqueta);
      return NextResponse.json(createdSub);
    }

    // Si se envía "removeSubetiqueta", se elimina la subetiqueta con ese valor
    if (data.removeSubetiqueta) {
      const removedSub = await Subetiqueta.findOneAndDelete({
        etiquetaId: id,
        valor: data.removeSubetiqueta,
      });
      if (!removedSub) {
        return NextResponse.json(
          { error: "Subetiqueta no encontrada" },
          { status: 404 }
        );
      }
      return NextResponse.json(removedSub);
    }

    return NextResponse.json(
      { error: "No se especificó una acción válida" },
      { status: 400 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error al actualizar la etiqueta" },
      { status: 500 }
    );
  }
}
