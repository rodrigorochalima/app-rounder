/**
 * Componente de Onboarding
 * Exibido no primeiro acesso do usuário
 */

import { useState } from 'react';
import { X, Check, ChevronRight, Shield, Zap, Users, BarChart } from 'lucide-react';


interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const totalSteps = 4;

  async function handleComplete() {
    if (!acceptedTerms) {
      alert('Você precisa aceitar os termos para continuar');
      return;
    }

    setLoading(true);

    try {
      // Marcar onboarding como completo
      onComplete();
    } catch (error) {
      console.error('Erro ao completar onboarding:', error);
      alert('Erro ao salvar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#5B9BD5] to-[#4A90E2] p-6 rounded-t-3xl text-white relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                <img src="/rounder-icon.png" alt="Rounder" className="w-10 h-10 rounded-xl" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Bem-vindo ao App Rounder!</h2>
                <p className="text-sm opacity-90">Nexo Soluções Digitais</p>
              </div>
            </div>
          </div>
          
          {/* Progress */}
          <div className="flex gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-all ${
                  i + 1 <= step ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-[#5B9BD5] to-[#4A90E2] rounded-2xl mx-auto mb-4 flex items-center justify-center">
                  <Zap className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-[#2C3E50] mb-2">
                  Geração Inteligente de Rounds
                </h3>
                <p className="text-gray-600">
                  Crie documentos médicos profissionais em segundos usando IA de última geração
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-2xl">
                  <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center mb-3">
                    <Check className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="font-bold text-[#2C3E50] mb-1">Rápido</h4>
                  <p className="text-sm text-gray-600">Gere rounds em menos de 2 minutos</p>
                </div>

                <div className="bg-green-50 p-4 rounded-2xl">
                  <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center mb-3">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="font-bold text-[#2C3E50] mb-1">Seguro</h4>
                  <p className="text-sm text-gray-600">Seus dados são criptografados</p>
                </div>

                <div className="bg-purple-50 p-4 rounded-2xl">
                  <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center mb-3">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="font-bold text-[#2C3E50] mb-1">Colaborativo</h4>
                  <p className="text-sm text-gray-600">Trabalhe em equipe</p>
                </div>

                <div className="bg-orange-50 p-4 rounded-2xl">
                  <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center mb-3">
                    <BarChart className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="font-bold text-[#2C3E50] mb-1">Inteligente</h4>
                  <p className="text-sm text-gray-600">Aprende com seu uso</p>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-[#2C3E50]">Como funciona?</h3>
              
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-[#2C3E50] mb-1">Configure suas APIs</h4>
                    <p className="text-gray-600">Escolha até 3 APIs de IA para usar simultaneamente</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="font-bold text-[#2C3E50] mb-1">Faça upload dos documentos</h4>
                    <p className="text-gray-600">Round anterior e transcrição do dia</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="font-bold text-[#2C3E50] mb-1">Aguarde o processamento</h4>
                    <p className="text-gray-600">A IA analisa e gera o documento</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                    4
                  </div>
                  <div>
                    <h4 className="font-bold text-[#2C3E50] mb-1">Baixe o resultado</h4>
                    <p className="text-gray-600">Documento pronto em formato .docx</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-[#2C3E50]">Integrações Futuras</h3>
              
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-2xl">
                <h4 className="font-bold text-[#2C3E50] mb-3">🚀 Em breve:</h4>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span><strong>Power BI:</strong> Dashboards automáticos com métricas</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span><strong>EPIMED:</strong> Integração com sistema de gestão hospitalar</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span><strong>Chat interno:</strong> Comunicação entre equipe</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span><strong>Relatórios:</strong> Exportação de dados e estatísticas</span>
                  </li>
                </ul>
              </div>

              <div className="bg-yellow-50 border-2 border-yellow-200 p-4 rounded-2xl">
                <p className="text-sm text-yellow-900">
                  <strong>💡 Dica:</strong> O app está preparado para crescer com você. Novas funcionalidades serão adicionadas regularmente!
                </p>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-[#2C3E50]">Termos de Uso e Privacidade</h3>
              
              <div className="bg-gray-50 p-6 rounded-2xl max-h-96 overflow-y-auto space-y-4 text-sm text-gray-700">
                <div>
                  <h4 className="font-bold text-[#2C3E50] mb-2">1. Coleta e Uso de Dados</h4>
                  <p>
                    A Nexo Soluções Digitais coleta e processa dados para:
                  </p>
                  <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                    <li>Gerar estatísticas e métricas de uso</li>
                    <li>Melhorar a qualidade dos documentos gerados</li>
                    <li>Desenvolver novos produtos e funcionalidades</li>
                    <li>Criar índices e benchmarks do setor</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-[#2C3E50] mb-2">2. Privacidade e Segurança</h4>
                  <p>
                    <strong>Garantimos que:</strong>
                  </p>
                  <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                    <li>Dados sensíveis de pacientes NÃO serão divulgados</li>
                    <li>Informações são criptografadas e armazenadas com segurança</li>
                    <li>Você mantém propriedade total dos seus documentos</li>
                    <li>Cumprimos a LGPD (Lei Geral de Proteção de Dados)</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-[#2C3E50] mb-2">3. Produtos Derivados</h4>
                  <p>
                    A Nexo poderá criar produtos derivados dos índices e estatísticas gerados, 
                    sempre respeitando a privacidade e anonimizando os dados.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-[#2C3E50] mb-2">4. Consentimento</h4>
                  <p>
                    Ao aceitar estes termos, você concorda com a coleta e uso dos dados 
                    conforme descrito acima.
                  </p>
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="w-5 h-5 rounded border-2 border-gray-300 text-blue-500 focus:ring-2 focus:ring-blue-500 mt-0.5"
                />
                <span className="text-sm text-gray-700">
                  Li e aceito os <strong>Termos de Uso</strong> e a <strong>Política de Privacidade</strong>. 
                  Autorizo a coleta e uso dos meus dados conforme descrito.
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Passo {step} de {totalSteps}
          </div>

          <div className="flex gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-semibold transition-colors"
              >
                Voltar
              </button>
            )}

            {step < totalSteps ? (
              <button
                onClick={() => setStep(step + 1)}
                className="px-6 py-3 bg-gradient-to-r from-[#5B9BD5] to-[#4A90E2] hover:opacity-90 text-white rounded-2xl font-semibold transition-all flex items-center gap-2"
              >
                Próximo
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={!acceptedTerms || loading}
                className="px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:opacity-90 text-white rounded-2xl font-semibold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Salvando...' : 'Começar a usar'}
                {!loading && <Check className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
