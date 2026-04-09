import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [validacoes, setValidacoes] = useState([])
  const [progresso, setProgresso] = useState(0)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    async function carregar() {
      try {
        setProgresso(20)

        const { data: licencas, error: errLic } = await supabase
          .from('licencas')
          .select('tipo, status, expira_em')

        setProgresso(50)

        if (errLic) throw new Error(errLic.message)

        const hoje = new Date()
        const em30dias = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000)
        setStats({
          total: licencas.length,
          ativas: licencas.filter(l => l.status === 'ativa').length,
          permanentes: licencas.filter(l => l.tipo === 'permanente').length,
          mensais: licencas.filter(l => l.tipo === 'mensal').length,
          expirandoEm30: licencas.filter(l =>
            l.tipo === 'mensal' && l.expira_em &&
            new Date(l.expira_em) < em30dias && new Date(l.expira_em) > hoje
          ).length,
          revogadas: licencas.filter(l => l.status === 'revogada').length,
        })

        setProgresso(75)

        // Busca validações e depois enriquece com dados da licença separadamente
        const { data: vals, error: errVal } = await supabase
          .from('validacoes')
          .select('id, resultado, criada_em, licenca_id')
          .order('criada_em', { ascending: false })
          .limit(10)

        if (!errVal && vals?.length) {
          const ids = [...new Set(vals.map(v => v.licenca_id).filter(Boolean))]
          const { data: lics } = await supabase
            .from('licencas')
            .select('id, chave, cliente_nome')
            .in('id', ids)

          const licMap = Object.fromEntries((lics || []).map(l => [l.id, l]))
          setValidacoes(vals.map(v => ({ ...v, licenca: licMap[v.licenca_id] || null })))
        }

        setProgresso(100)
      } catch (e) {
        setErro(e.message || 'Erro ao carregar dados.')
        setProgresso(100)
      }
    }
    carregar()
  }, [])

  if (progresso < 100) {
    return (
      <div className="carregando-wrap">
        <div className="progress-bar-fundo">
          <div className="progress-bar-fill" style={{ width: `${progresso}%` }} />
        </div>
        <p className="carregando-label">Carregando... {progresso}%</p>
      </div>
    )
  }

  if (erro) {
    return <p className="erro">Erro ao carregar: {erro}</p>
  }

  return (
    <div className="page">
      <h2 className="page-title">Visão Geral</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-valor">{stats.total}</span>
          <span className="stat-label">Total de licenças</span>
        </div>
        <div className="stat-card verde">
          <span className="stat-valor">{stats.ativas}</span>
          <span className="stat-label">Ativas</span>
        </div>
        <div className="stat-card azul">
          <span className="stat-valor">{stats.permanentes}</span>
          <span className="stat-label">Permanentes</span>
        </div>
        <div className="stat-card roxo">
          <span className="stat-valor">{stats.mensais}</span>
          <span className="stat-label">Mensais</span>
        </div>
        <div className="stat-card amarelo">
          <span className="stat-valor">{stats.expirandoEm30}</span>
          <span className="stat-label">Expirando em 30 dias</span>
        </div>
        <div className="stat-card vermelho">
          <span className="stat-valor">{stats.revogadas}</span>
          <span className="stat-label">Revogadas</span>
        </div>
      </div>

      <h2 className="page-title" style={{ marginTop: '2rem' }}>Últimas Validações</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Chave</th>
              <th>Resultado</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            {validacoes.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: '#9e9e9e' }}>Nenhuma validação registrada.</td></tr>
            ) : validacoes.map(v => (
              <tr key={v.id}>
                <td>{v.licenca?.cliente_nome || '—'}</td>
                <td className="chave">{v.licenca?.chave || '—'}</td>
                <td><span className={`badge badge-${v.resultado === 'ok' ? 'verde' : 'vermelho'}`}>{v.resultado}</span></td>
                <td>{new Date(v.criada_em).toLocaleString('pt-BR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
