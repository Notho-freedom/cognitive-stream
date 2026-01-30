import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { ActionPayload } from './types';

/**
 * FormValue represents any value stored in the form state
 * Can be string (input), string[] (multiple choice), or any other value
 */
type FormValue = string | string[] | number | boolean | Record<string, unknown>;

/**
 * FormState is a map of field IDs to their current values
 */
interface FormState {
  [fieldId: string]: FormValue;
}

/**
 * Context interface for the cognitive form system
 */
interface CognitiveFormContextType {
  /** Current form values */
  formState: FormState;
  
  /** Register or update a field value */
  setFieldValue: (fieldId: string, value: FormValue) => void;
  
  /** Remove a field from the form state */
  removeField: (fieldId: string) => void;
  
  /** Get all current form values */
  getAllValues: () => FormState;
  
  /** Clear all form values */
  resetForm: () => void;
  
  /** Build an ActionPayload that includes all form data */
  buildActionWithFormData: (actionId: string, additionalPayload?: Record<string, unknown>) => ActionPayload;
}

const CognitiveFormContext = createContext<CognitiveFormContextType | null>(null);

interface CognitiveFormProviderProps {
  children: ReactNode;
  onAction?: (action: ActionPayload) => void;
}

/**
 * CognitiveFormProvider manages form state across all interactive components
 * 
 * When a button is clicked, it can collect all input/choice values
 * and send them together as a single action payload
 */
export function CognitiveFormProvider({ children, onAction }: CognitiveFormProviderProps) {
  const [formState, setFormState] = useState<FormState>({});

  const setFieldValue = useCallback((fieldId: string, value: FormValue) => {
    setFormState(prev => ({
      ...prev,
      [fieldId]: value,
    }));
    console.log(`[FormContext] Field "${fieldId}" updated:`, value);
  }, []);

  const removeField = useCallback((fieldId: string) => {
    setFormState(prev => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  }, []);

  const getAllValues = useCallback(() => {
    return { ...formState };
  }, [formState]);

  const resetForm = useCallback(() => {
    setFormState({});
  }, []);

  const buildActionWithFormData = useCallback((
    actionId: string, 
    additionalPayload?: Record<string, unknown>
  ): ActionPayload => {
    return {
      id: actionId,
      payload: {
        actionType: 'form-submit',
        formData: { ...formState },
        ...additionalPayload,
      },
    };
  }, [formState]);

  return (
    <CognitiveFormContext.Provider
      value={{
        formState,
        setFieldValue,
        removeField,
        getAllValues,
        resetForm,
        buildActionWithFormData,
      }}
    >
      {children}
    </CognitiveFormContext.Provider>
  );
}

/**
 * Hook to access the cognitive form context
 * Returns null if used outside of CognitiveFormProvider (for standalone components)
 */
export function useCognitiveForm(): CognitiveFormContextType | null {
  return useContext(CognitiveFormContext);
}

/**
 * Hook that requires the form context (throws if not in provider)
 */
export function useRequiredCognitiveForm(): CognitiveFormContextType {
  const context = useContext(CognitiveFormContext);
  if (!context) {
    throw new Error('useCognitiveForm must be used within a CognitiveFormProvider');
  }
  return context;
}
