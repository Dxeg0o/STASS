import { NextResponse, NextRequest } from "next/server";
import { connectDb } from "@/lib/mongodb";
import Etiqueta from "@/models/tags";
import mongoose from "mongoose";

export async function GET(request: NextRequest) {
  await connectDb();

  // Extraemos el parámetro empresaId de la URL
  const { searchParams } = new URL(request.url);
  const empresaId = searchParams.get("empresaId");

  let tags;
  if (empresaId) {
    // Si se proporciona empresaId, filtramos las etiquetas
    tags = await Etiqueta.find({ empresaId });
  } else {
    // Si no se proporciona, obtenemos todas las etiquetas
    tags = await Etiqueta.find();
  }

  return NextResponse.json(tags);
}

export async function POST(request: NextRequest) {
  await connectDb();
  const data = await request.json();

  // Si no se envía _id, lo generamos automáticamente.
  if (!data._id) {
    data._id = new mongoose.Types.ObjectId().toString();
  }

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

    return NextResponse.json({ message: "Etiqueta eliminada exitosamente" });
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

  // Extraemos el id de la URL
  const { searchParams } = new URL(request.url);
  const queryId = searchParams.get("id");

  // Obtenemos los datos del body
  const data = await request.json();

  // Si no viene _id en el body, usamos el id de la query
  const id = data._id || queryId;

  if (!id) {
    return NextResponse.json(
      { error: "Falta el id de la etiqueta a actualizar" },
      { status: 400 }
    );
  }

  try {
    // Aquí podrías diferenciar la lógica según si es para agregar o eliminar una subetiqueta
    // Ejemplo para agregar una subetiqueta:
    if (data.subetiqueta) {
      // Suponiendo que la lógica es agregar una subetiqueta al arreglo "valores"
      const updatedTag = await Etiqueta.findByIdAndUpdate(
        id,
        { $push: { valores: data.subetiqueta } },
        { new: true }
      );
      if (!updatedTag) {
        return NextResponse.json(
          { error: "Etiqueta no encontrada" },
          { status: 404 }
        );
      }
      return NextResponse.json(updatedTag);
    }

    // Ejemplo para eliminar una subetiqueta:
    if (data.removeSubetiqueta) {
      const updatedTag = await Etiqueta.findByIdAndUpdate(
        id,
        { $pull: { valores: data.removeSubetiqueta } },
        { new: true }
      );
      if (!updatedTag) {
        return NextResponse.json(
          { error: "Etiqueta no encontrada" },
          { status: 404 }
        );
      }
      return NextResponse.json(updatedTag);
    }

    // En caso de otros tipos de actualizaciones, puedes agregar la lógica necesaria
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
