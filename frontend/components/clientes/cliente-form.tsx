'use client'

import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { clienteSchema, type ClienteInput } from '@/lib/validators'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import type { Cliente } from '@/types'
import type { ClienteCreate } from '@/lib/api/clientes'

function applyCpfCnpjMask(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

function applyPhoneMask(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
  }
  return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
}

interface ClienteFormProps {
  initialData?: Cliente
  onSubmit: (data: ClienteCreate) => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
}

export function ClienteForm({ initialData, onSubmit, onCancel, isSubmitting }: ClienteFormProps) {
  const [nomeFantasia, setNomeFantasia] = useState(initialData?.nome_fantasia ?? '')

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<ClienteInput>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      tipo_pessoa: initialData?.tipo_pessoa ?? 'FISICA',
      nome: initialData?.nome ?? '',
      cpf_cnpj: initialData?.cpf_cnpj ?? '',
      email: initialData?.email ?? '',
      telefone: initialData?.telefone ?? '',
      whatsapp: initialData?.whatsapp ?? '',
      cidade: initialData?.cidade ?? '',
      uf: initialData?.uf ?? '',
      origem: initialData?.origem ?? '',
      observacoes: initialData?.observacoes ?? '',
    },
  })

  const tipoPessoa = useWatch({ control, name: 'tipo_pessoa' })

  async function handleFormSubmit(data: ClienteInput) {
    const payload: ClienteCreate = { ...data }
    if (data.cpf_cnpj) {
      payload.cpf_cnpj = data.cpf_cnpj.replace(/\D/g, '')
    }
    if (data.telefone) {
      payload.telefone = data.telefone.replace(/\D/g, '')
    }
    if (data.whatsapp) {
      payload.whatsapp = data.whatsapp.replace(/\D/g, '')
    }
    payload.nome_fantasia = tipoPessoa === 'JURIDICA' ? nomeFantasia || null : null
    await onSubmit(payload)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tipo_pessoa">Tipo de Pessoa</Label>
          <Select id="tipo_pessoa" {...register('tipo_pessoa')}>
            <option value="FISICA">Física</option>
            <option value="JURIDICA">Jurídica</option>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="nome">Nome</Label>
          <Input
            id="nome"
            placeholder="Nome completo"
            hasError={!!errors.nome}
            {...register('nome')}
          />
          {errors.nome && (
            <p className="text-sm text-destructive">{errors.nome.message}</p>
          )}
        </div>

        {tipoPessoa === 'JURIDICA' && (
          <div className="space-y-2">
            <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
            <Input
              id="nome_fantasia"
              placeholder="Nome fantasia"
              value={nomeFantasia}
              onChange={(e) => setNomeFantasia(e.target.value)}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="cpf_cnpj">{tipoPessoa === 'FISICA' ? 'CPF' : 'CNPJ'}</Label>
          <Input
            id="cpf_cnpj"
            placeholder={tipoPessoa === 'FISICA' ? '000.000.000-00' : '00.000.000/0000-00'}
            maxLength={tipoPessoa === 'FISICA' ? 14 : 18}
            hasError={!!errors.cpf_cnpj}
            {...register('cpf_cnpj')}
            onChange={(e) => {
              const masked = applyCpfCnpjMask(e.target.value)
              setValue('cpf_cnpj', masked, { shouldValidate: true })
            }}
          />
          {errors.cpf_cnpj && (
            <p className="text-sm text-destructive">{errors.cpf_cnpj.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            placeholder="email@exemplo.com"
            hasError={!!errors.email}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="telefone">Telefone</Label>
          <Input
            id="telefone"
            placeholder="(00) 0000-0000"
            maxLength={15}
            {...register('telefone')}
            onChange={(e) => {
              const masked = applyPhoneMask(e.target.value)
              setValue('telefone', masked, { shouldValidate: true })
            }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="whatsapp">WhatsApp</Label>
          <Input
            id="whatsapp"
            placeholder="(00) 00000-0000"
            maxLength={15}
            {...register('whatsapp')}
            onChange={(e) => {
              const masked = applyPhoneMask(e.target.value)
              setValue('whatsapp', masked, { shouldValidate: true })
            }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cidade">Cidade</Label>
          <Input
            id="cidade"
            placeholder="Cidade"
            {...register('cidade')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="uf">UF</Label>
          <Input
            id="uf"
            placeholder="UF"
            maxLength={2}
            className="uppercase"
            hasError={!!errors.uf}
            {...register('uf')}
            onChange={(e) => {
              setValue('uf', e.target.value.toUpperCase(), { shouldValidate: e.target.value.length === 2 })
            }}
          />
          {errors.uf && (
            <p className="text-sm text-destructive">{errors.uf.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="origem">Origem</Label>
          <Select id="origem" {...register('origem')}>
            <option value="">Selecione...</option>
            <option value="Site">Site</option>
            <option value="Indicação">Indicação</option>
            <option value="Redes Sociais">Redes Sociais</option>
            <option value="Google">Google</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="Ligação">Ligação</option>
            <option value="Outro">Outro</option>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea
          id="observacoes"
          placeholder="Observações..."
          rows={3}
          {...register('observacoes')}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar
        </Button>
      </div>
    </form>
  )
}
