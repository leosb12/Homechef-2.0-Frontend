export type FuncionIACodigo = 'asistente_ia' | 'vision_artificial' | 'demanda_precios' | 'publicacion_platos'

export type IACodigoRespuesta =
  | 'ACCESO_AUTORIZADO'
  | 'USUARIO_NO_AUTENTICADO'
  | 'ROL_NO_AUTORIZADO'
  | 'SUSCRIPCION_INEXISTENTE'
  | 'SUSCRIPCION_INACTIVA'
  | 'PLAN_SIN_IA'
  | 'LIMITE_IA_SUPERADO'
  | 'FUNCION_IA_NO_EXISTE'
  | 'IA_NO_IMPLEMENTADA'

export interface UsarFuncionIARequest {
  funcion: FuncionIACodigo | string
}

export interface UsarFuncionIAResponse {
  permitido: boolean
  codigo: IACodigoRespuesta
  mensaje: string
}
