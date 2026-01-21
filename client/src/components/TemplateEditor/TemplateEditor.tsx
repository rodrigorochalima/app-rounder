import { useEffect, useRef, useState } from 'react';
import grapesjs, { Editor } from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import './TemplateEditor.css';
import { useAuth } from '../../contexts/AuthContext';

interface TemplateEditorProps {
  onSave: (templateData: TemplateData) => void;
  initialTemplate?: TemplateData;
}

export interface TemplateData {
  id?: string;
  name: string;
  html: string;
  css: string;
  isDefault: boolean;
}

const DEFAULT_TEMPLATES = {
  classic: {
    name: 'Clássico',
    html: `
      <div class="a4-page">
        <header class="header">
          <div class="logo-container">
            <img src="{{logoUrl}}" alt="Logo" class="logo" />
          </div>
          <div class="header-info">
            <h1>{{hospitalName}}</h1>
            <p>{{hospitalPhone}}</p>
          </div>
        </header>
        
        <main class="content">
          <h2>Round Médico - {{date}}</h2>
          <div class="round-content">
            {{roundContent}}
          </div>
        </main>
        
        <footer class="footer">
          <hr />
          <p><strong>Dr(a). {{fullName}}</strong> - CRM {{crm}}/{{crmState}}</p>
          <p>{{position}} - {{specialty}}</p>
          <p>{{hospitalName}} - Tel: {{hospitalPhone}}</p>
          <p>Email: {{email}} | Cel: {{personalPhone}}</p>
        </footer>
      </div>
    `,
    css: `
      .a4-page {
        width: 210mm;
        min-height: 297mm;
        padding: 20mm;
        margin: 0 auto;
        background: white;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
        font-family: Arial, sans-serif;
        color: #333;
      }
      
      .header {
        display: flex;
        align-items: center;
        gap: 20px;
        padding-bottom: 15px;
        border-bottom: 3px solid #4f46e5;
        margin-bottom: 30px;
      }
      
      .logo-container {
        flex-shrink: 0;
      }
      
      .logo {
        max-width: 80px;
        max-height: 80px;
        object-fit: contain;
      }
      
      .header-info h1 {
        margin: 0;
        font-size: 24px;
        color: #4f46e5;
      }
      
      .header-info p {
        margin: 5px 0 0 0;
        font-size: 14px;
        color: #666;
      }
      
      .content {
        min-height: 180mm;
      }
      
      .content h2 {
        font-size: 20px;
        color: #333;
        margin-bottom: 20px;
      }
      
      .round-content {
        line-height: 1.6;
        font-size: 12px;
      }
      
      .footer {
        margin-top: 30px;
        padding-top: 15px;
        border-top: 2px solid #e5e7eb;
        font-size: 11px;
        text-align: center;
        color: #666;
      }
      
      .footer p {
        margin: 5px 0;
      }
      
      @media print {
        .a4-page {
          box-shadow: none;
          margin: 0;
        }
      }
    `
  },
  modern: {
    name: 'Moderno',
    html: `
      <div class="a4-page modern">
        <aside class="sidebar">
          <div class="logo-container">
            <img src="{{logoUrl}}" alt="Logo" class="logo" />
          </div>
          <div class="doctor-info">
            <h3>Dr(a). {{fullName}}</h3>
            <p>CRM {{crm}}/{{crmState}}</p>
            <p>{{specialty}}</p>
          </div>
          <div class="contact-info">
            <p>{{hospitalName}}</p>
            <p>{{hospitalPhone}}</p>
            <p>{{email}}</p>
          </div>
        </aside>
        
        <main class="main-content">
          <header>
            <h1>Round Médico</h1>
            <p class="date">{{date}}</p>
          </header>
          
          <div class="round-content">
            {{roundContent}}
          </div>
          
          <footer>
            <p>Documento gerado em {{date}}</p>
          </footer>
        </main>
      </div>
    `,
    css: `
      .a4-page.modern {
        width: 210mm;
        min-height: 297mm;
        margin: 0 auto;
        background: white;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
        display: flex;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      }
      
      .sidebar {
        width: 60mm;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20mm;
        display: flex;
        flex-direction: column;
        gap: 30px;
      }
      
      .sidebar .logo {
        max-width: 100%;
        max-height: 60px;
        object-fit: contain;
        filter: brightness(0) invert(1);
      }
      
      .doctor-info h3 {
        margin: 0 0 10px 0;
        font-size: 18px;
      }
      
      .doctor-info p {
        margin: 5px 0;
        font-size: 13px;
        opacity: 0.9;
      }
      
      .contact-info p {
        margin: 5px 0;
        font-size: 11px;
        opacity: 0.8;
      }
      
      .main-content {
        flex: 1;
        padding: 20mm;
      }
      
      .main-content header {
        margin-bottom: 30px;
      }
      
      .main-content h1 {
        margin: 0;
        font-size: 28px;
        color: #333;
      }
      
      .date {
        margin: 10px 0 0 0;
        font-size: 14px;
        color: #666;
      }
      
      .round-content {
        line-height: 1.6;
        font-size: 12px;
        color: #333;
      }
      
      .main-content footer {
        margin-top: 30px;
        padding-top: 15px;
        border-top: 1px solid #e5e7eb;
        font-size: 10px;
        color: #999;
        text-align: center;
      }
    `
  },
  minimal: {
    name: 'Minimalista',
    html: `
      <div class="a4-page minimal">
        <main>
          <div class="header-minimal">
            <h1>Round Médico</h1>
            <p>{{date}}</p>
          </div>
          
          <div class="round-content">
            {{roundContent}}
          </div>
        </main>
        
        <footer class="footer-minimal">
          <p>Dr(a). {{fullName}} - CRM {{crm}}/{{crmState}} - {{specialty}}</p>
          <p>{{hospitalName}} - {{hospitalPhone}} - {{email}}</p>
        </footer>
      </div>
    `,
    css: `
      .a4-page.minimal {
        width: 210mm;
        min-height: 297mm;
        padding: 25mm;
        margin: 0 auto;
        background: white;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
        font-family: 'Georgia', serif;
        color: #222;
      }
      
      .header-minimal {
        margin-bottom: 40px;
      }
      
      .header-minimal h1 {
        margin: 0;
        font-size: 32px;
        font-weight: 300;
        color: #000;
      }
      
      .header-minimal p {
        margin: 10px 0 0 0;
        font-size: 14px;
        color: #666;
        font-style: italic;
      }
      
      .round-content {
        line-height: 1.8;
        font-size: 12px;
        min-height: 220mm;
      }
      
      .footer-minimal {
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px solid #ccc;
        font-size: 10px;
        color: #666;
        text-align: center;
      }
      
      .footer-minimal p {
        margin: 5px 0;
      }
    `
  },
  institutional: {
    name: 'Institucional',
    html: `
      <div class="a4-page institutional">
        <header class="header-institutional">
          <div class="header-bg">
            <img src="{{logoUrl}}" alt="Logo" class="logo-large" />
            <div class="header-text">
              <h1>{{hospitalName}}</h1>
              <p>{{hospitalPhone}}</p>
            </div>
          </div>
        </header>
        
        <main class="content-institutional">
          <div class="title-section">
            <h2>Round Médico</h2>
            <p class="date">{{date}}</p>
          </div>
          
          <div class="round-content">
            {{roundContent}}
          </div>
        </main>
        
        <footer class="footer-institutional">
          <div class="footer-content">
            <p><strong>Dr(a). {{fullName}}</strong></p>
            <p>CRM {{crm}}/{{crmState}} - {{specialty}}</p>
            <p>{{position}}</p>
            <p>Email: {{email}} | Cel: {{personalPhone}}</p>
          </div>
        </footer>
      </div>
    `,
    css: `
      .a4-page.institutional {
        width: 210mm;
        min-height: 297mm;
        margin: 0 auto;
        background: white;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
        font-family: 'Arial', sans-serif;
      }
      
      .header-institutional {
        background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
        color: white;
        padding: 20mm;
      }
      
      .header-bg {
        display: flex;
        align-items: center;
        gap: 20px;
      }
      
      .logo-large {
        max-width: 100px;
        max-height: 100px;
        object-fit: contain;
        filter: brightness(0) invert(1);
      }
      
      .header-text h1 {
        margin: 0;
        font-size: 28px;
        font-weight: 700;
      }
      
      .header-text p {
        margin: 10px 0 0 0;
        font-size: 16px;
        opacity: 0.9;
      }
      
      .content-institutional {
        padding: 20mm;
      }
      
      .title-section {
        margin-bottom: 30px;
        padding-bottom: 15px;
        border-bottom: 3px solid #3b82f6;
      }
      
      .title-section h2 {
        margin: 0;
        font-size: 24px;
        color: #1e40af;
      }
      
      .title-section .date {
        margin: 10px 0 0 0;
        font-size: 14px;
        color: #666;
      }
      
      .round-content {
        line-height: 1.6;
        font-size: 12px;
        color: #333;
      }
      
      .footer-institutional {
        background: #f3f4f6;
        padding: 15mm 20mm;
        margin-top: 30px;
      }
      
      .footer-content {
        text-align: center;
        font-size: 11px;
        color: #666;
      }
      
      .footer-content p {
        margin: 5px 0;
      }
    `
  }
};

export function TemplateEditor({ onSave, initialTemplate }: TemplateEditorProps) {
  const editorRef = useRef<Editor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [templateName, setTemplateName] = useState(initialTemplate?.name || '');
  const [isDefault, setIsDefault] = useState(initialTemplate?.isDefault || false);
  const [selectedPreset, setSelectedPreset] = useState<keyof typeof DEFAULT_TEMPLATES>('classic');
  const { user } = useAuth();

  useEffect(() => {
    if (!containerRef.current || editorRef.current) return;

    // Inicializar GrapesJS
    const editor = grapesjs.init({
      container: containerRef.current,
      height: '600px',
      width: 'auto',
      storageManager: false,
      panels: {
        defaults: [
          {
            id: 'basic-actions',
            el: '.panel__basic-actions',
            buttons: [
              {
                id: 'visibility',
                active: true,
                className: 'btn-toggle-borders',
                label: '<i class="fa fa-clone"></i>',
                command: 'sw-visibility'
              }
            ]
          },
          {
            id: 'panel-devices',
            el: '.panel__devices',
            buttons: [
              {
                id: 'device-desktop',
                label: '<i class="fa fa-desktop"></i>',
                command: 'set-device-desktop',
                active: true,
                togglable: false
              },
              {
                id: 'device-mobile',
                label: '<i class="fa fa-mobile"></i>',
                command: 'set-device-mobile',
                togglable: false
              }
            ]
          }
        ]
      },
      deviceManager: {
        devices: [
          {
            name: 'Desktop',
            width: '210mm'
          },
          {
            name: 'Mobile',
            width: '320px',
            widthMedia: '480px'
          }
        ]
      },
      blockManager: {
        appendTo: '.blocks-container',
        blocks: [
          {
            id: 'section',
            label: '<div class="gjs-block-label">Seção</div>',
            content: '<section class="section"><h2>Nova Seção</h2><p>Conteúdo aqui...</p></section>',
            category: 'Básico'
          },
          {
            id: 'text',
            label: '<div class="gjs-block-label">Texto</div>',
            content: '<p>Insira seu texto aqui</p>',
            category: 'Básico'
          },
          {
            id: 'image',
            label: '<div class="gjs-block-label">Imagem</div>',
            content: '<img src="https://via.placeholder.com/350x150" alt="Imagem" />',
            category: 'Mídia'
          },
          {
            id: 'header',
            label: '<div class="gjs-block-label">Cabeçalho</div>',
            content: '<header class="header"><h1>Título</h1></header>',
            category: 'Layout'
          },
          {
            id: 'footer',
            label: '<div class="gjs-block-label">Rodapé</div>',
            content: '<footer class="footer"><p>Rodapé</p></footer>',
            category: 'Layout'
          },
          {
            id: 'divider',
            label: '<div class="gjs-block-label">Divisor</div>',
            content: '<hr />',
            category: 'Básico'
          }
        ]
      },
      styleManager: {
        appendTo: '.styles-container',
        sectors: [
          {
            name: 'Dimensões',
            open: false,
            buildProps: ['width', 'height', 'max-width', 'min-height', 'margin', 'padding']
          },
          {
            name: 'Tipografia',
            open: false,
            buildProps: ['font-family', 'font-size', 'font-weight', 'letter-spacing', 'color', 'line-height', 'text-align']
          },
          {
            name: 'Decorações',
            open: false,
            buildProps: ['background-color', 'border-radius', 'border', 'box-shadow']
          }
        ]
      },
      layerManager: {
        appendTo: '.layers-container'
      },
      traitManager: {
        appendTo: '.traits-container'
      }
    });

    editorRef.current = editor;

    // Carregar template inicial
    if (initialTemplate) {
      editor.setComponents(initialTemplate.html);
      editor.setStyle(initialTemplate.css);
    } else {
      loadPreset('classic');
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, []);

  const loadPreset = (preset: keyof typeof DEFAULT_TEMPLATES) => {
    if (!editorRef.current) return;

    const template = DEFAULT_TEMPLATES[preset];
    
    // Substituir variáveis com dados do usuário
    let html = template.html;
    let css = template.css;

    if (user) {
      html = html
        .replace(/\{\{logoUrl\}\}/g, user.logoUrl || 'https://via.placeholder.com/80')
        .replace(/\{\{hospitalName\}\}/g, user.hospitalName || 'Nome do Hospital')
        .replace(/\{\{hospitalPhone\}\}/g, user.hospitalPhone || '(00) 0000-0000')
        .replace(/\{\{fullName\}\}/g, user.fullName || 'Nome do Médico')
        .replace(/\{\{crm\}\}/g, user.crm || '00000')
        .replace(/\{\{crmState\}\}/g, user.crmState || 'UF')
        .replace(/\{\{specialty\}\}/g, user.specialty || 'Especialidade')
        .replace(/\{\{position\}\}/g, user.position || 'Cargo')
        .replace(/\{\{email\}\}/g, user.email || 'email@exemplo.com')
        .replace(/\{\{personalPhone\}\}/g, user.personalPhone || '(00) 00000-0000')
        .replace(/\{\{date\}\}/g, new Date().toLocaleDateString('pt-BR'))
        .replace(/\{\{roundContent\}\}/g, '<p>Conteúdo do round será inserido aqui...</p>');
    }

    editorRef.current.setComponents(html);
    editorRef.current.setStyle(css);
    setTemplateName(template.name);
    setSelectedPreset(preset);
  };

  const handleSave = () => {
    if (!editorRef.current) return;

    const html = editorRef.current.getHtml();
    const css = editorRef.current.getCss();

    const templateData: TemplateData = {
      name: templateName || 'Novo Template',
      html,
      css,
      isDefault
    };

    onSave(templateData);
  };

  return (
    <div className="template-editor">
      <div className="editor-toolbar">
        <div className="toolbar-left">
          <input 
            type="text"
            placeholder="Nome do Template"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="template-name-input"
          />
          
          <label className="default-checkbox">
            <input 
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
            />
            Definir como padrão
          </label>
        </div>

        <div className="toolbar-center">
          <label>Template Pré-configurado:</label>
          <select 
            value={selectedPreset}
            onChange={(e) => loadPreset(e.target.value as keyof typeof DEFAULT_TEMPLATES)}
          >
            <option value="classic">Clássico</option>
            <option value="modern">Moderno</option>
            <option value="minimal">Minimalista</option>
            <option value="institutional">Institucional</option>
          </select>
        </div>

        <div className="toolbar-right">
          <button onClick={handleSave} className="btn-save-template">
            Salvar Template
          </button>
        </div>
      </div>

      <div className="editor-container">
        <div className="editor-sidebar">
          <div className="panel__basic-actions"></div>
          <div className="panel__devices"></div>
          <div className="blocks-container"></div>
        </div>

        <div className="editor-canvas" ref={containerRef}></div>

        <div className="editor-properties">
          <div className="styles-container"></div>
          <div className="traits-container"></div>
          <div className="layers-container"></div>
        </div>
      </div>

      <div className="editor-info">
        <p><strong>Variáveis disponíveis:</strong></p>
        <code>
          {`{{logoUrl}}, {{hospitalName}}, {{hospitalPhone}}, {{fullName}}, {{crm}}, {{crmState}}, {{specialty}}, {{position}}, {{email}}, {{personalPhone}}, {{date}}, {{roundContent}}`}
        </code>
      </div>
    </div>
  );
}
