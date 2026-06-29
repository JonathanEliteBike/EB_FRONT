import { VarianteColor } from './VarianteColor.model';
import { ProductoBusqueda } from './ProductoBusqueda.model';

export interface ProductoGrupo {
  producto: string;
  modelo: string;
  marca: string;
  colores: VarianteColor[];
  soloUna?: ProductoBusqueda;
}