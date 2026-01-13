import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, XCircle, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface IntegrationConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: string;
  title: string;
  integration: any | null;
  onSaved: () => void;
}

const PROVIDER_CONFIG = {
  elevenlabs: {
    label: 'ElevenLabs API Key',
    placeholder: 'xi-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    docsUrl: 'https://elevenlabs.io/app/settings/api-keys',
    description: 'Obtenha sua chave de API em elevenlabs.io → Settings → API Keys',
    extraFields: [
      { key: 'agent_id', label: 'Agent ID (opcional)', placeholder: 'agent_xxxxxxxx' }
    ]
  },
  openai: {
    label: 'OpenAI API Key',
    placeholder: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    docsUrl: 'https://platform.openai.com/api-keys',
    description: 'Obtenha sua chave de API em platform.openai.com → API Keys',
    extraFields: []
  },
  vapi: {
    label: 'Vapi API Key',
    placeholder: 'vapi-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    docsUrl: 'https://dashboard.vapi.ai/account',
    description: 'Obtenha sua chave de API em dashboard.vapi.ai → Account',
    extraFields: [
      { key: 'phone_number_id', label: 'Phone Number ID (opcional)', placeholder: 'pn_xxxxxxxx' }
    ]
  }
};

export function IntegrationConfigDialog({
  open,
  onOpenChange,
  provider,
  title,
  integration,
  onSaved
}: IntegrationConfigDialogProps) {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [configJson, setConfigJson] = useState<Record<string, string>>({});
  const [showKey, setShowKey] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{ valid: boolean; error?: string } | null>(null);

  const config = PROVIDER_CONFIG[provider as keyof typeof PROVIDER_CONFIG] || {
    label: 'API Key',
    placeholder: 'Sua chave de API',
    docsUrl: '',
    description: '',
    extraFields: []
  };

  useEffect(() => {
    if (open) {
      setApiKey('');
      setApiSecret('');
      setShowKey(false);
      setVerificationResult(null);
      if (integration?.config_json) {
        setConfigJson(integration.config_json as Record<string, string>);
      } else {
        setConfigJson({});
      }
    }
  }, [open, integration]);

  const handleVerify = async () => {
    if (!apiKey.trim()) {
      toast({ title: 'Informe a API Key', variant: 'destructive' });
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('verify-integration', {
        body: { provider, api_key: apiKey }
      });

      if (error) throw error;

      setVerificationResult(data);
      
      if (data.valid) {
        toast({ title: 'API Key válida!' });
      } else {
        toast({ title: 'API Key inválida', description: data.error, variant: 'destructive' });
      }
    } catch (error: any) {
      console.error('Error verifying:', error);
      setVerificationResult({ valid: false, error: error.message });
      toast({ title: 'Erro ao verificar', description: error.message, variant: 'destructive' });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      toast({ title: 'Informe a API Key', variant: 'destructive' });
      return;
    }

    setIsSaving(true);

    try {
      const { data, error } = await supabase.functions.invoke('save-integration', {
        body: { 
          provider, 
          api_key: apiKey,
          api_secret: apiSecret || null,
          config_json: configJson
        }
      });

      if (error) throw error;

      toast({ title: 'Integração salva com sucesso!' });
      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving:', error);
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configurar {title}</DialogTitle>
          <DialogDescription>
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">{config.label}</Label>
            <div className="relative">
              <Input
                id="api-key"
                type={showKey ? 'text' : 'password'}
                placeholder={config.placeholder}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setVerificationResult(null);
                }}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {config.docsUrl && (
              <a 
                href={config.docsUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                Obter API Key <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          {config.extraFields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={field.key}>{field.label}</Label>
              <Input
                id={field.key}
                placeholder={field.placeholder}
                value={configJson[field.key] || ''}
                onChange={(e) => setConfigJson({ ...configJson, [field.key]: e.target.value })}
              />
            </div>
          ))}

          {verificationResult && (
            <Alert variant={verificationResult.valid ? 'default' : 'destructive'}>
              <AlertDescription className="flex items-center gap-2">
                {verificationResult.valid ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    API Key verificada com sucesso!
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    {verificationResult.error || 'API Key inválida'}
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleVerify} disabled={isVerifying || !apiKey.trim()}>
            {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verificar
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !apiKey.trim()}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
