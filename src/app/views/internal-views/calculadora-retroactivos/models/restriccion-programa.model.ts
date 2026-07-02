export interface RestriccionPrograma{
    descripcion: string,
    valor: string
}

export const LISTA_RESTRICCIONES_PROGRAMA: RestriccionPrograma[] = [
    { descripcion: "CAMBIO DE NIVEL DE DISTRIBUCIÓN A UN NIVEL INFERIOR" , valor: "Si por motivo de incumplimiento o por deseo del distribuidor se cambia de Nivel hacia un Nivel inferior, y dicho cambio es posterior a finalizar el primer bloque, el Distribuidor pierde los derechos de obtener retroactivos anuales, si dicho cambio se efectúa antes de finalizar el primer bloque, deberá cumplir con los requisitos de la categoría a la que se está cambiando."},
    { descripcion: "CAMBIO DE NIVEL DE DISTRIBUCIÓN A UN NIVEL SUPERIOR:" , valor: "2.- CAMBIO DE NIVEL DE DISTRIBUCIÓN A UN NIVEL SUPERIOR: En los casos que el Distribuidor decide cambiar a un nivel superior, lo podrá hacer en cualquier momento, y deberá cumplir los requisitos de la categoria superior para acceder a los descuentos retroactivos."},
    { descripcion: "PRECIOS DE LAS PAQUETERIAS:" , valor: "Las tarifas de las paqueterias, normalmente se negocían con las mísmas a principios de cada temporada, y casi siempre permanecen por todo el periodo, en los últimos meses, esta situación ha cambiado, y en ocasiones los costos se incrementaron considerablemente, por lo tanto, en el caso de sufrir un aumento considerable tendremos que impactarlo en los precios cobrados, sin dejar de lado que el objeto del programa de subisidio a los costos de los fletes es con el objeto de mejorar nuestra oferta de negocio y lograr que la rentabilidad con Elite Bike sea cada temporada mejor."},
    { descripcion: "SUBSIDIO A SEGURO DE TRANSPORTE:" , valor: "En la presente temporada en algunos niveles de distribución se subsidia al 100% el costo cobrado por concepto de seguro de transporte, para revisar las condiciones de los riesgos de transito, debes revisar nuestras politicas de venta."},
    { descripcion: "DESCUENTO POR PRE-PAGO O PAGO DE CONTADO:" , valor: "Este descuento se efectúa mediante nota de crédito, dias despues de haber hecho la compra o pago, no es parte de los descuentos retroactivos."},
]