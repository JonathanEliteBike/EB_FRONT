export interface SimuladorRetroactivo {
  id: number;
  descripcion: string;
  cantidadIngresada: number;
  cantidadAMostrar: string;
  compraMinima: number;
  totalCompraConDescuento: number;
  porcentaje: number;
  totalMargenConDescuento: number;
  totalMargenConPorcentaje: number;
  totalBeneficios: number
  totalMargenCalculado: number;
  //Fletes
  promedioBicicleta: number;
}