export interface CalculoMargenesRetroactivos {
  id: number;
  descripcion: string,
  margen_precio_distribuidor: number,
  margen_inicio_temporada: number,
  nivel_elegido: string,
  suma_descuento_retroactivo: number
  margen_con_descuento_retroactivo: number
}