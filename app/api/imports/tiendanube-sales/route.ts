import { NextResponse } from "next/server";
import { importTiendanubeSalesCsv } from "@/lib/importers/tiendanube-sales";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Archivo CSV requerido." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await importTiendanubeSalesCsv(buffer);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo importar el CSV." },
      { status: 500 },
    );
  }
}
