/**
 * Dicionário de Terminologia Médica - UTI/SUS
 * Base de conhecimento para validação de termos médicos
 */

// ============================================
// MEDICAMENTOS COMUNS NO SUS
// ============================================

export const MEDICAMENTOS_SUS = [
  // Antibióticos
  'Meropenem',
  'Ceftriaxone',
  'Ceftriaxona',
  'Vancomicina',
  'Piperacilina',
  'Tazobactam',
  'Piperacilina + Tazobactam',
  'Tazocin',
  'Metronidazol',
  'Ciprofloxacino',
  'Levofloxacino',
  'Amicacina',
  'Gentamicina',
  'Oxacilina',
  'Ampicilina',
  'Sulbactam',
  'Ampicilina + Sulbactam',
  'Clindamicina',
  'Fluconazol',
  'Anfotericina B',
  'Polimixina B',
  'Linezolida',
  'Teicoplanina',
  'Azitromicina',
  'Claritromicina',
  'Cefepime',
  'Ceftazidima',
  'Ertapenem',
  'Imipenem',
  'Cilastatin',
  'Sulfametoxazol',
  'Trimetoprima',
  'Bactrim',
  
  // Drogas Vasoativas (DVA)
  'Norepinefrina',
  'Noradrenalina',
  'Dobutamina',
  'Dopamina',
  'Vasopressina',
  'Adrenalina',
  'Epinefrina',
  'Milrinona',
  'Fenilefrina',
  
  // Sedação e Analgesia
  'Fentanil',
  'Midazolam',
  'Propofol',
  'Dexmedetomidina',
  'Precedex',
  'Morfina',
  'Tramadol',
  'Dipirona',
  'Paracetamol',
  'Cetamina',
  'Remifentanil',
  'Sufentanil',
  'Atracúrio',
  'Rocurônio',
  'Cisatracúrio',
  
  // Anticoagulantes
  'Heparina',
  'Enoxaparina',
  'Varfarina',
  'Rivaroxabana',
  'Apixabana',
  'Dabigatrana',
  
  // Diuréticos
  'Furosemida',
  'Lasix',
  'Espironolactona',
  'Hidroclorotiazida',
  'Manitol',
  
  // Cardiovasculares
  'Amiodarona',
  'Metoprolol',
  'Atenolol',
  'Carvedilol',
  'Enalapril',
  'Captopril',
  'Losartana',
  'Anlodipino',
  'Nifedipino',
  'Digoxina',
  'Nitroglicerina',
  'Nitroprussiato',
  
  // Gastrointestinais
  'Omeprazol',
  'Pantoprazol',
  'Ranitidina',
  'Metoclopramida',
  'Bromoprida',
  'Ondansetrona',
  'Lactulose',
  
  // Corticoides
  'Hidrocortisona',
  'Metilprednisolona',
  'Dexametasona',
  'Prednisona',
  
  // Outros
  'Insulina',
  'Glicose',
  'Soro Fisiológico',
  'Ringer Lactato',
  'Bicarbonato de Sódio',
  'Cloreto de Potássio',
  'Sulfato de Magnésio',
  'Gluconato de Cálcio',
  'Vitamina K',
  'Complexo B',
  'Ácido Fólico',
  'Ferro',
  'Albumina',
  'Plasma',
  'Concentrado de Hemácias',
  'Plaquetas',
  'Crioprecipitado',
];

// ============================================
// SIGLAS COMUNS EM UTI
// ============================================

export const SIGLAS_UTI = {
  // Ventilação e Oxigenação
  'VM': 'Ventilação Mecânica',
  'VNI': 'Ventilação Não Invasiva',
  'CPAP': 'Pressão Positiva Contínua nas Vias Aéreas',
  'BiPAP': 'Pressão Positiva Bifásica nas Vias Aéreas',
  'PEEP': 'Pressão Positiva Expiratória Final',
  'FiO2': 'Fração Inspirada de Oxigênio',
  'SpO2': 'Saturação Periférica de Oxigênio',
  'PaO2': 'Pressão Parcial de Oxigênio',
  'PaCO2': 'Pressão Parcial de Gás Carbônico',
  'IOT': 'Intubação Orotraqueal',
  'TQT': 'Traqueostomia',
  
  // Hemodinâmica
  'DVA': 'Droga Vasoativa',
  'PAM': 'Pressão Arterial Média',
  'PAS': 'Pressão Arterial Sistólica',
  'PAD': 'Pressão Arterial Diastólica',
  'FC': 'Frequência Cardíaca',
  'PVC': 'Pressão Venosa Central',
  'DC': 'Débito Cardíaco',
  'IC': 'Índice Cardíaco',
  
  // Respiratório
  'FR': 'Frequência Respiratória',
  'VC': 'Volume Corrente',
  'VM': 'Volume Minuto',
  'Pplatô': 'Pressão de Platô',
  'Ppico': 'Pressão de Pico',
  'Compl': 'Complacência',
  
  // Dispositivos
  'SNE': 'Sonda Nasoenteral',
  'SVD': 'Sonda Vesical de Demora',
  'CVC': 'Cateter Venoso Central',
  'PAI': 'Pressão Arterial Invasiva',
  'BIA': 'Balão Intra-Aórtico',
  
  // Exames Laboratoriais
  'Hb': 'Hemoglobina',
  'Ht': 'Hematócrito',
  'Leuco': 'Leucócitos',
  'Plaq': 'Plaquetas',
  'Cr': 'Creatinina',
  'Ur': 'Ureia',
  'K': 'Potássio',
  'Na': 'Sódio',
  'Ca': 'Cálcio',
  'Mg': 'Magnésio',
  'P': 'Fósforo',
  'PCR': 'Proteína C Reativa',
  'VHS': 'Velocidade de Hemossedimentação',
  'BT': 'Bilirrubina Total',
  'BD': 'Bilirrubina Direta',
  'BI': 'Bilirrubina Indireta',
  'TGO': 'Transaminase Glutâmico Oxalacética',
  'TGP': 'Transaminase Glutâmico Pirúvica',
  'GGT': 'Gama Glutamil Transferase',
  'FA': 'Fosfatase Alcalina',
  'INR': 'Razão Normalizada Internacional',
  'TAP': 'Tempo de Atividade de Protrombina',
  'TTPA': 'Tempo de Tromboplastina Parcial Ativada',
  'BIC': 'Bicarbonato',
  'BE': 'Base Excess',
  'Lac': 'Lactato',
  
  // Exames de Imagem
  'TC': 'Tomografia Computadorizada',
  'RX': 'Raio-X',
  'USG': 'Ultrassonografia',
  'ECG': 'Eletrocardiograma',
  'ECO': 'Ecocardiograma',
  'RM': 'Ressonância Magnética',
  
  // Procedimentos
  'EDA': 'Endoscopia Digestiva Alta',
  'CPRE': 'Colangiopancreatografia Retrógrada Endoscópica',
  'Colonoscopia': 'Colonoscopia',
  'Broncoscopia': 'Broncoscopia',
  
  // Escalas
  'RASS': 'Richmond Agitation-Sedation Scale',
  'CAM-ICU': 'Confusion Assessment Method for ICU',
  'APACHE': 'Acute Physiology and Chronic Health Evaluation',
  'SOFA': 'Sequential Organ Failure Assessment',
  'Glasgow': 'Escala de Coma de Glasgow',
  
  // Outros
  'PCR': 'Parada Cardiorrespiratória',
  'RCP': 'Ressuscitação Cardiopulmonar',
  'SARA': 'Síndrome da Angústia Respiratória Aguda',
  'SDRA': 'Síndrome do Desconforto Respiratório Agudo',
  'SIRS': 'Síndrome da Resposta Inflamatória Sistêmica',
  'Sepse': 'Sepse',
  'Choque Séptico': 'Choque Séptico',
  'TEP': 'Tromboembolismo Pulmonar',
  'TVP': 'Trombose Venosa Profunda',
  'AVC': 'Acidente Vascular Cerebral',
  'IAM': 'Infarto Agudo do Miocárdio',
  'ICC': 'Insuficiência Cardíaca Congestiva',
  'IRA': 'Insuficiência Renal Aguda',
  'IRC': 'Insuficiência Renal Crônica',
  'DPOC': 'Doença Pulmonar Obstrutiva Crônica',
  'DM': 'Diabetes Mellitus',
  'HAS': 'Hipertensão Arterial Sistêmica',
  'HIV': 'Vírus da Imunodeficiência Humana',
  'AIDS': 'Síndrome da Imunodeficiência Adquirida',
  'COVID': 'COVID-19',
  'H1N1': 'Influenza A H1N1',
};

// ============================================
// PROCEDIMENTOS COMUNS EM UTI
// ============================================

export const PROCEDIMENTOS_UTI = [
  'Intubação orotraqueal',
  'Intubação nasotraqueal',
  'Traqueostomia',
  'Passagem de cateter venoso central',
  'Passagem de cateter de Swan-Ganz',
  'Passagem de sonda nasoenteral',
  'Passagem de sonda vesical de demora',
  'Punção arterial',
  'Dissecção venosa',
  'Toracocentese',
  'Paracentese',
  'Pericardiocentese',
  'Drenagem torácica',
  'Broncoscopia',
  'Endoscopia digestiva alta',
  'Colonoscopia',
  'Diálise',
  'Hemodiálise',
  'Hemofiltração',
  'Plasmaférese',
  'Cardioversão elétrica',
  'Desfibrilação',
  'Marcapasso temporário',
  'Balão intra-aórtico',
  'ECMO',
  'Pronação',
  'Recrutamento alveolar',
  'Aspiração de vias aéreas',
  'Troca de cânula de traqueostomia',
  'Curativo de ferida operatória',
  'Debridamento',
  'Punção lombar',
];

// ============================================
// VIAS DE ADMINISTRAÇÃO
// ============================================

export const VIAS_ADMINISTRACAO = [
  'IV', 'Intravenoso',
  'VO', 'Via Oral',
  'SC', 'Subcutâneo',
  'IM', 'Intramuscular',
  'SL', 'Sublingual',
  'Inalatório',
  'Tópico',
  'Retal',
  'Enteral',
  'SNE', 'Por Sonda Nasoenteral',
  'Infusão Contínua',
  'Bolus',
  'ACM', 'A Critério Médico',
];

// ============================================
// UNIDADES DE MEDIDA
// ============================================

export const UNIDADES_MEDIDA = [
  'mg', 'miligramas',
  'g', 'gramas',
  'mcg', 'microgramas',
  'UI', 'Unidades Internacionais',
  'mL', 'mililitros',
  'L', 'litros',
  'mg/kg', 'miligramas por quilo',
  'mcg/kg/min', 'microgramas por quilo por minuto',
  'mL/h', 'mililitros por hora',
  'gotas/min', 'gotas por minuto',
  'cp', 'comprimido',
  'amp', 'ampola',
  'fr', 'frasco',
];

// ============================================
// CORREÇÕES COMUNS (Mapeamento)
// ============================================

export const CORRECOES_COMUNS: Record<string, string> = {
  // Medicamentos
  'Meropenen': 'Meropenem',
  'Meropenem': 'Meropenem',
  'Ceftriaxona': 'Ceftriaxone',
  'Noradrenalina': 'Norepinefrina',
  'Tramal': 'Tramadol',
  'Plasil': 'Metoclopramida',
  'Buscopan': 'Escopolamina',
  'Novalgina': 'Dipirona',
  'Tylenol': 'Paracetamol',
  
  // Siglas
  'IOT': 'Intubação Orotraqueal',
  'TQT': 'Traqueostomia',
  'VM': 'Ventilação Mecânica',
  'DVA': 'Droga Vasoativa',
  
  // Outros
  'Entubado': 'Intubado',
  'Desentubado': 'Extubado',
};

// ============================================
// FUNÇÃO: Validar termo médico
// ============================================

export function validarTermoMedico(termo: string): {
  valido: boolean;
  correcao?: string;
  tipo?: string;
} {
  const termoLimpo = termo.trim();
  
  // Verificar se está no dicionário de medicamentos
  if (MEDICAMENTOS_SUS.includes(termoLimpo)) {
    return { valido: true, tipo: 'medicamento' };
  }
  
  // Verificar se é uma sigla conhecida
  if (termoLimpo in SIGLAS_UTI) {
    return { valido: true, tipo: 'sigla' };
  }
  
  // Verificar se é um procedimento
  if (PROCEDIMENTOS_UTI.includes(termoLimpo)) {
    return { valido: true, tipo: 'procedimento' };
  }
  
  // Verificar se tem correção conhecida
  if (termoLimpo in CORRECOES_COMUNS) {
    return {
      valido: false,
      correcao: CORRECOES_COMUNS[termoLimpo],
      tipo: 'correcao'
    };
  }
  
  // Termo não encontrado
  return { valido: false };
}

// ============================================
// FUNÇÃO: Extrair termos médicos de um texto
// ============================================

export function extrairTermosMedicos(texto: string): string[] {
  const palavras = texto.split(/\s+/);
  const termosMedicos: string[] = [];
  
  for (const palavra of palavras) {
    const palavraLimpa = palavra.replace(/[.,;:!?()[\]{}]/g, '');
    const resultado = validarTermoMedico(palavraLimpa);
    
    if (resultado.valido) {
      termosMedicos.push(palavraLimpa);
    }
  }
  
  return termosMedicos;
}
