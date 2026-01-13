import { useState } from 'react';
import { Script, ScriptStep, ScriptField } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, CheckCircle, Lightbulb } from 'lucide-react';

interface ScriptWizardProps {
  script: Script;
  leadName?: string;
  agentName?: string;
  onComplete?: (data: Record<string, any>) => void;
}

export function ScriptWizard({ script, leadName = '[Nome]', agentName = '[Agente]', onComplete }: ScriptWizardProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const currentStep = script.steps[currentStepIndex];
  const progress = ((currentStepIndex + 1) / script.steps.length) * 100;

  const interpolateContent = (content: string) => {
    return content
      .replace(/\[NOME\]/g, leadName)
      .replace(/\[AGENTE\]/g, agentName);
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleNext = () => {
    // Check for branches
    if (currentStep.branches && currentStep.branches.length > 0) {
      for (const branch of currentStep.branches) {
        // Simple condition evaluation (in real app, use a proper parser)
        const field = currentStep.fields[0];
        if (field && formData[field.id]) {
          const condition = branch.condition.replace(field.name, `"${formData[field.id]}"`);
          try {
            if (eval(condition)) {
              const nextIndex = script.steps.findIndex((s) => s.id === branch.nextStepId);
              if (nextIndex !== -1) {
                setCurrentStepIndex(nextIndex);
                return;
              }
            }
          } catch (e) {
            // Fallback to sequential
          }
        }
      }
    }

    // Sequential next
    if (currentStepIndex < script.steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      onComplete?.(formData);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const renderField = (field: ScriptField) => {
    switch (field.type) {
      case 'SELECT':
        return (
          <Select
            value={formData[field.id] || ''}
            onValueChange={(value) => handleFieldChange(field.id, value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'CHECKBOX':
        return (
          <div className="flex items-center gap-2">
            <Checkbox
              id={field.id}
              checked={formData[field.id] || false}
              onCheckedChange={(checked) => handleFieldChange(field.id, checked)}
            />
            <Label htmlFor={field.id}>{field.name}</Label>
          </div>
        );
      default:
        return (
          <Input
            type={field.type === 'EMAIL' ? 'email' : field.type === 'PHONE' ? 'tel' : 'text'}
            value={formData[field.id] || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.name}
          />
        );
    }
  };

  return (
    <Card variant="glass">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Script: {script.name}</CardTitle>
          </div>
          <span className="text-sm text-muted-foreground">
            Etapa {currentStepIndex + 1} de {script.steps.length}
          </span>
        </div>
        <Progress value={progress} className="h-1.5 mt-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Step Title */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
            {currentStep.order}
          </div>
          <h4 className="font-semibold">{currentStep.title}</h4>
        </div>

        {/* Script Content */}
        <div className="rounded-lg bg-muted/50 p-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {interpolateContent(currentStep.content)}
          </p>
        </div>

        {/* Form Fields */}
        {currentStep.fields.length > 0 && (
          <div className="space-y-3">
            {currentStep.fields.map((field) => (
              <div key={field.id} className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {field.name}
                  {field.required && <span className="text-destructive">*</span>}
                </Label>
                {renderField(field)}
              </div>
            ))}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="ghost"
            onClick={handlePrevious}
            disabled={currentStepIndex === 0}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Anterior
          </Button>
          <Button onClick={handleNext}>
            {currentStepIndex === script.steps.length - 1 ? (
              <>
                <CheckCircle className="mr-1 h-4 w-4" />
                Concluir
              </>
            ) : (
              <>
                Próximo
                <ChevronRight className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
