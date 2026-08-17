import { useMemo } from 'react';

type LegalDocument = 'terms' | 'privacy' | 'clinical-ai';

const EFFECTIVE_DATE = '17 de agosto de 2026';

const documents: Record<LegalDocument, { title: string; subtitle: string; sections: Array<{ heading: string; body: string[] }> }> = {
  terms: {
    title: 'Termos de Uso',
    subtitle: `Versão ${EFFECTIVE_DATE}`,
    sections: [
      { heading: '1. Finalidade do serviço', body: [
        'O App Rounder é uma ferramenta de organização e apoio à redação de rounds assistenciais. Ele recebe documentos e transcrições fornecidos pelo usuário, aplica regras configuradas pelo próprio usuário e pode gerar rascunhos estruturados de documentos clínicos.',
        'O serviço não substitui avaliação médica, julgamento clínico, prontuário institucional, protocolos assistenciais, segunda checagem, discussão multiprofissional ou qualquer decisão de cuidado. O profissional responsável deve revisar integralmente cada saída antes de usá-la, assiná-la, compartilhá-la ou incorporá-la a qualquer documento clínico.'
      ]},
      { heading: '2. Conta, credenciais e uso autorizado', body: [
        'A conta é individual. O usuário deve manter senha, dispositivo e sessões sob sua guarda e comunicar imediatamente suspeitas de uso indevido. Não é permitido compartilhar credenciais ou inserir dados de terceiros sem autorização e base legal adequadas.',
        'O usuário é responsável por manter dados cadastrais corretos, por configurar suas chaves de provedores de IA e por assegurar que a instituição em que atua autorize o uso da ferramenta, quando aplicável.'
      ]},
      { heading: '3. Conteúdo clínico e inteligência artificial', body: [
        'Modelos de IA podem produzir informação incompleta, imprecisa ou inadequada ao contexto. O usuário deve confirmar doses, identificação do paciente, datas, leitos, alergias, exames, condutas, contadores e toda informação clínica relevante.',
        'Antes de enviar conteúdo a um provedor externo de IA, o usuário deve avaliar a necessidade, a minimização de dados, a base legal e as exigências de seu serviço de saúde. Quando possível, devem ser removidos identificadores diretos desnecessários.'
      ]},
      { heading: '4. Disponibilidade e alterações', body: [
        'O App Rounder pode ser atualizado para corrigir falhas, segurança e compatibilidade. Funcionalidades dependentes de navegador, sistema operacional, provedores de IA ou serviços externos podem ter limitações próprias.',
        'Alterações relevantes destes Termos serão publicadas nesta página com nova versão e poderão ser comunicadas no aplicativo ou por e-mail, quando houver canal disponível.'
      ]},
      { heading: '5. Limitação de uso', body: [
        'O serviço não se destina a emergências médicas, despacho de atendimento, monitorização em tempo real ou substituição de sistemas oficiais de prontuário. Não use o App Rounder como único meio de preservar informação clínica essencial.',
        'O uso em desacordo com estes Termos, com a legislação aplicável, com políticas institucionais ou com a confidencialidade profissional pode resultar em suspensão de acesso e outras medidas compatíveis com a legislação.'
      ]}
    ]
  },
  privacy: {
    title: 'Política de Privacidade',
    subtitle: `Versão ${EFFECTIVE_DATE}`,
    sections: [
      { heading: '1. Escopo e papéis de privacidade', body: [
        'Esta Política descreve o tratamento de dados no App Rounder. Conforme o contexto de uso, o profissional ou a instituição que define a finalidade do tratamento de informações clínicas pode atuar como controlador; a operação técnica do aplicativo pode atuar como operador. Essa definição deve ser confirmada pela instituição e por seus instrumentos contratuais.',
        'Dados de saúde são sensíveis. O uso do serviço exige que o usuário observe a LGPD, o dever de sigilo profissional, políticas institucionais e a base legal aplicável.'
      ]},
      { heading: '2. Dados tratados', body: [
        'O aplicativo pode tratar dados de conta e perfil, configurações, regras de redação, instituições, documentos enviados, transcrições, histórico de rounds, contexto clínico e metadados técnicos necessários para segurança, sessão e auditoria.',
        'Chaves de provedores de IA são cifradas no servidor e não são devolvidas ao navegador após o cadastro. Ainda assim, o usuário deve cadastrar somente chaves sob sua responsabilidade e revogá-las no provedor de origem quando necessário.'
      ]},
      { heading: '3. Finalidades e retenção', body: [
        'Os dados são usados para autenticação, segurança, geração e organização de rounds, memória clínica configurada, histórico, exportação, suporte e melhoria de confiabilidade. O índice RAG clínico é configurado para retenção operacional de até 60 dias, salvo ação de exclusão ou ajuste explícito do usuário.',
        'O usuário pode exportar seus dados e solicitar exclusão da conta diretamente pelo painel de privacidade. A exclusão elimina os dados associados sujeitos às limitações técnicas e legais aplicáveis.'
      ]},
      { heading: '4. Compartilhamento e fornecedores', body: [
        'Quando o usuário aciona uma geração ou transcrição, o conteúdo necessário é encaminhado ao provedor de IA que ele configurou. Isso pode envolver processamento em infraestrutura de terceiros. O usuário deve avaliar as políticas, localização, segurança e termos desses provedores antes de inserir dados identificáveis.',
        'Não vendemos dados pessoais. O compartilhamento ocorre apenas quando necessário para prestar o serviço, cumprir obrigação legal, prevenir fraude ou atender solicitação válida de autoridade competente.'
      ]},
      { heading: '5. Segurança e direitos', body: [
        'Aplicamos autenticação própria, cookies de sessão protegidos, rotação de sessões, limitação de tentativas, controles de acesso e criptografia de chaves cadastradas. Nenhuma medida elimina totalmente riscos; o usuário também deve proteger dispositivos e credenciais.',
        'O titular pode solicitar confirmação de tratamento, acesso, correção, anonimização, bloqueio, eliminação, portabilidade e informações sobre compartilhamento, nos limites da legislação aplicável. O canal operacional indicado no serviço é noreply@nexo.center; a instituição usuária poderá disponibilizar canal próprio complementar.'
      ]}
    ]
  },
  'clinical-ai': {
    title: 'Aviso de Segurança Clínica e IA',
    subtitle: `Versão ${EFFECTIVE_DATE}`,
    sections: [
      { heading: 'Revisão humana obrigatória', body: [
        'Toda saída gerada pelo App Rounder é um rascunho. Ela deve ser revisada por profissional habilitado antes de qualquer uso assistencial. Nunca presuma que a IA reconheceu corretamente nomes, leitos, doses, exames, cronologia, alergias ou pendências.'
      ]},
      { heading: 'Minimização e confidencialidade', body: [
        'Inclua somente o mínimo de dados necessário. Evite identificadores diretos quando eles não forem indispensáveis à finalidade clínica. Não use a ferramenta se as políticas de sua instituição não permitirem o processamento externo aplicável.'
      ]},
      { heading: 'Limites técnicos', body: [
        'O aplicativo não é um prontuário eletrônico, não funciona como monitor de emergência e não garante disponibilidade contínua de serviços de terceiros. Mantenha registros oficiais nos sistemas institucionais apropriados.'
      ]}
    ]
  }
};

export default function LegalPage({ document }: { document: LegalDocument }) {
  const content = useMemo(() => documents[document], [document]);
  return (
    <main style={{ minHeight: '100vh', background: '#f4f8fc', padding: '32px 16px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#213547' }}>
      <article style={{ maxWidth: 880, margin: '0 auto', background: '#fff', borderRadius: 16, padding: 'clamp(22px, 5vw, 52px)', boxShadow: '0 8px 32px rgba(35, 81, 119, .12)' }}>
        <a href="/" style={{ color: '#2c6ea3', textDecoration: 'none', fontWeight: 700 }}>← Voltar ao App Rounder</a>
        <header style={{ borderBottom: '1px solid #dce8f3', marginTop: 24, marginBottom: 28, paddingBottom: 20 }}>
          <p style={{ color: '#527089', fontSize: 14, margin: '0 0 8px' }}>APP ROUNDER · NEXO SOLUÇÕES DIGITAIS</p>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', margin: 0, color: '#173b59' }}>{content.title}</h1>
          <p style={{ color: '#527089', margin: '10px 0 0' }}>{content.subtitle}</p>
        </header>
        <div style={{ background: '#eef7ff', borderLeft: '4px solid #2c80b9', padding: '14px 16px', borderRadius: 8, marginBottom: 28, lineHeight: 1.55 }}>
          Este documento é informativo e deve ser revisado por assessoria jurídica antes de qualquer distribuição comercial ou institucional. Ele não substitui acordos de tratamento de dados, contratos com instituições ou políticas internas de saúde.
        </div>
        {content.sections.map((section) => (
          <section key={section.heading} style={{ marginBottom: 28 }}>
            <h2 style={{ color: '#173b59', fontSize: 20, marginBottom: 10 }}>{section.heading}</h2>
            {section.body.map((paragraph) => <p key={paragraph} style={{ lineHeight: 1.7, margin: '0 0 12px' }}>{paragraph}</p>)}
          </section>
        ))}
        <footer style={{ borderTop: '1px solid #dce8f3', paddingTop: 20, color: '#527089', fontSize: 14 }}>
          <a href="/legal/terms" style={{ color: '#2c6ea3', marginRight: 16 }}>Termos</a>
          <a href="/legal/privacy" style={{ color: '#2c6ea3', marginRight: 16 }}>Privacidade</a>
          <a href="/legal/clinical-ai" style={{ color: '#2c6ea3' }}>Aviso clínico e IA</a>
        </footer>
      </article>
    </main>
  );
}

export type { LegalDocument };
