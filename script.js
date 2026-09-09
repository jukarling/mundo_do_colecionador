// ==========================================
// 1. ESTADO GLOBAL E VARIÁVEIS
// ==========================================
let produtos = [];

let estado = {
    telaAtual: 'home',
    categoriaFiltro: 'todos',
    termoBusca: '',
    descontoPercentual: 0,
    cupomCodigo: '',
    freteValor: 0,
    cepDigitado: '',
    modoAutenticacao: 'login'
};

let autoPlayTimer = null;

// ==========================================
// LOGOS E NOMES POR CATEGORIA
// (Ajuste os caminhos abaixo conforme os nomes reais dos seus arquivos na pasta 'imagens/')
// ==========================================
const logosCategorias = {
    'todos': 'imagens/Logo.png',
    'canecas': 'imagens/logo-canecas.png',
    'ac': 'imagens/logo-ac.png',
    'quadros': 'imagens/logo-quadros.png',
    'mangas': 'imagens/logo-manga.png',
    'ln': 'imagens/logo-ln.png',
    'hq': 'imagens/logo-quadrinhos.png',
    'games': 'imagens/logo-games.png',
    'colecionaveis': 'imagens/logo-colecionaveis.png',
    'roupas': 'imagens/logo-roupas.png'
};

// Atualiza a logo no Header de acordo com a categoria selecionada
function atualizarLogoHeader() {
    const logoImg = document.querySelector('#logoLink img');
    if (logoImg) {
        const catAtiva = estado.telaAtual === 'home' ? estado.categoriaFiltro : 'todos';
        const caminhoLogo = logosCategorias[catAtiva] || logosCategorias['todos'];
        
        logoImg.src = caminhoLogo;
        logoImg.alt = `Logo ${nomesCategorias[catAtiva] || "Collector's Hub"}`;
    }
}

// ==========================================
// 2. SISTEMA DE NOTIFICAÇÕES (TOAST)
// ==========================================
function exibirToast(mensagem) {
    let toast = document.getElementById('toast-hub');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-hub';
        toast.style.cssText = `
            position: fixed; bottom: 20px; right: 20px; 
            background: #6c5ce7; color: #fff; 
            padding: 12px 24px; border-radius: 8px; font-weight: 600;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 10000;
            transition: opacity 0.3s ease, transform 0.3s ease;
            opacity: 0; transform: translateY(10px);
        `;
        document.body.appendChild(toast);
    }
    toast.textContent = mensagem;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
    }, 3000);
}

// ==========================================
// 3. BUSCA DE DADOS DO JSON E PERSISTÊNCIA
// ==========================================
function salvarProdutos(novosProdutos) {
    produtos = novosProdutos;
    localStorage.setItem("produtos_hub", JSON.stringify(produtos));
}

async function carregarProdutos() {
    try {
        const resposta = await fetch('produtos.json');
        if (!resposta.ok) throw new Error(`Erro na requisição: ${resposta.status}`);

        const produtosJson = await resposta.json();
        const estoqueSalvo = JSON.parse(localStorage.getItem("produtos_hub"));

        if (estoqueSalvo && Array.isArray(estoqueSalvo)) {
            produtos = produtosJson.map(p => {
                const itemSalvo = estoqueSalvo.find(s => s.id === p.id);
                return itemSalvo ? { ...p, estoque: itemSalvo.estoque } : p;
            });
        } else {
            produtos = produtosJson;
        }

        render();
    } catch (erro) {
        console.error('Erro ao carregar produtos.json:', erro);
        const main = document.getElementById('app');
        if (main) {
            main.innerHTML = `
                <div style="text-align: center; padding: 50px; color: #ff5252;">
                    <h2>⚠️ Não foi possível carregar os produtos</h2>
                    <p>Verifique se o arquivo <strong>produtos.json</strong> está na mesma pasta do projeto.</p>
                </div>
            `;
        }
    }
}

// ==========================================
// 4. GERENCIAMENTO DE USUÁRIO
// ==========================================
function getUsuarioLogado() {
    return JSON.parse(localStorage.getItem("usuario_hub")) || null;
}

function salvarUsuario(usuario) {
    localStorage.setItem("usuario_hub", JSON.stringify(usuario));
    atualizarUIHeader();
}

function fazerLogout() {
    localStorage.removeItem("usuario_hub");
    atualizarUIHeader();
    navegaPara('home');
}

function atualizarUIHeader() {
    const btnCadastro = document.getElementById("btnIrCadastro");
    const usuario = getUsuarioLogado();

    if (usuario && btnCadastro) {
        const primeiroNome = usuario.nome.split(' ')[0];
        btnCadastro.innerHTML = `<span class="icon">👤 ${primeiroNome}</span>`;
        btnCadastro.title = `Conectado como ${usuario.nome}`;
    } else if (btnCadastro) {
        btnCadastro.innerHTML = `<span class="icon">👤</span>`;
        btnCadastro.title = "Cadastro / Login";
    }
}

// ==========================================
// 5. GERENCIAMENTO DO CARRINHO
// ==========================================
function getCarrinho() {
    return JSON.parse(localStorage.getItem("carrinho_hub")) || [];
}

function salvarCarrinho(carrinho) {
    localStorage.setItem("carrinho_hub", JSON.stringify(carrinho));
    atualizarBadge();
}

function atualizarBadge() {
    const badge = document.getElementById("cartCountBadge");
    if (badge) {
        const carrinho = getCarrinho();
        const total = carrinho.reduce((acc, item) => acc + item.qtd, 0);
        badge.textContent = total;
    }
}

function adicionarAoCarrinho(id) {
    const prod = produtos.find(p => p.id === id);
    if (!prod || prod.estoque <= 0) return;

    let carrinho = getCarrinho();
    const itemExistente = carrinho.find(i => i.id === id);

    if (itemExistente) {
        if (itemExistente.qtd < prod.estoque) {
            itemExistente.qtd += 1;
        } else {
            exibirToast("⚠️ Limite de estoque atingido!");
            return;
        }
    } else {
        carrinho.push({ ...prod, qtd: 1 });
    }

    salvarCarrinho(carrinho);
    exibirToast(`⚡ ${prod.nome} adicionado ao carrinho!`);
    render();
}

// ==========================================
// 6. GERENCIAMENTO DO MODAL DE PRODUTO
// ==========================================
function abrirModal(produto) {
    const modal = document.getElementById('modalProduto');
    if (!modal) return;

    document.getElementById('modalImagem').src = produto.imagem;
    document.getElementById('modalTitulo').textContent = produto.nome;
    document.getElementById('modalDescricao').textContent = produto.descricao || 'Sem descrição detalhada disponível.';
    
    const modalPreco = document.getElementById('modalPreco');
    const modalPrecoAntigo = document.getElementById('modalPrecoAntigo');

    modalPreco.textContent = `R$ ${produto.preco.toFixed(2).replace('.', ',')}`;
    if (produto.precoOriginal && produto.precoOriginal > produto.preco) {
        modalPrecoAntigo.textContent = `R$ ${produto.precoOriginal.toFixed(2).replace('.', ',')}`;
        modalPrecoAntigo.style.display = 'inline';
    } else {
        modalPrecoAntigo.style.display = 'none';
    }

    const btnAdd = document.getElementById('modalBtnAdicionar');
    btnAdd.onclick = () => {
        adicionarAoCarrinho(produto.id);
        fecharModal();
    };

    modal.classList.add('active');

}

function fecharModal() {
    const modal = document.getElementById('modalProduto');
    if (modal) modal.classList.remove('active');
}



// ==========================================
// 7. CONFIGURAÇÕES E TEMA
// ==========================================
function getConfiguracoes() {
    return JSON.parse(localStorage.getItem("config_hub")) || {
        tema: 'dark',
        notificacoes: true,
        moeda: 'BRL'
    };
}

function salvarConfiguracoes(config) {
    localStorage.setItem("config_hub", JSON.stringify(config));
    aplicarTema(config.tema);
}

function aplicarTema(tema) {
    if (tema === 'light') {
        document.body.classList.add('light-mode');
    } else {
        document.body.classList.remove('light-mode');
    }
}

// ==========================================
// 8. GERENCIADOR DO CARROSSEL
// ==========================================
function inicializarCarrossel() {
    if (autoPlayTimer) clearInterval(autoPlayTimer);

    const track = document.getElementById('carrosselTrack');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const wrapper = document.querySelector('.carrossel-wrapper');

    if (!track || !prevBtn || !nextBtn) return;

    const cardWidth = 250;
    const gap = 20;
    const step = cardWidth + gap;
    let currentPosition = 0;
    const intervalTime = 3000;

    const moveNext = () => {
        const maxScroll = -(track.scrollWidth - track.parentElement.clientWidth);
        currentPosition -= step;
        if (currentPosition < maxScroll - 10) currentPosition = 0;
        track.style.transform = `translateX(${currentPosition}px)`;
    };

    const movePrev = () => {
        if (currentPosition === 0) {
            const maxScroll = -(track.scrollWidth - track.parentElement.clientWidth);
            currentPosition = maxScroll;
        } else {
            currentPosition += step;
            if (currentPosition > 0) currentPosition = 0;
        }
        track.style.transform = `translateX(${currentPosition}px)`;
    };

    nextBtn.onclick = moveNext;
    prevBtn.onclick = movePrev;

    const startAutoPlay = () => {
        if (autoPlayTimer) clearInterval(autoPlayTimer);
        autoPlayTimer = setInterval(moveNext, intervalTime);
    };

    const stopAutoPlay = () => clearInterval(autoPlayTimer);

    startAutoPlay();

    if (wrapper) {
        wrapper.onmouseenter = stopAutoPlay;
        wrapper.onmouseleave = startAutoPlay;
    }
}

// ==========================================
// 9. ROTEADOR E RENDERS
// ==========================================
function navegaPara(tela) {
    if (autoPlayTimer) clearInterval(autoPlayTimer);
    estado.telaAtual = tela;
    render();
}

function render() {
    const main = document.getElementById('app');
    if (!main) return;

    atualizarBadge();

    if (estado.telaAtual === 'home') renderHome(main);
    else if (estado.telaAtual === 'carrinho') renderCarrinho(main);
    else if (estado.telaAtual === 'cadastro') renderCadastro(main);
    else if (estado.telaAtual === 'configuracoes') renderConfiguracoes(main);
}

function renderPrecoHTML(p) {
    if (p.precoOriginal && p.precoOriginal > p.preco) {
        const pctDesconto = Math.round(((p.precoOriginal - p.preco) / p.precoOriginal) * 100);
        return `
            <div class="container-preco">
                <span class="preco-antigo">R$ ${p.precoOriginal.toFixed(2).replace('.', ',')}</span>
                <span class="preco-atual">R$ ${p.preco.toFixed(2).replace('.', ',')}</span>
                <span class="badge-desconto">-${pctDesconto}%</span>
            </div>
        `;
    }
    return `<div class="container-preco"><span class="preco-atual">R$ ${p.preco.toFixed(2).replace('.', ',')}</span></div>`;
}

function renderHome(container) {
    const produtosDestaque = produtos.filter(p => p.destaque);
    
    const listaFiltrada = produtos.filter(p => {
        const atendeCategoria = estado.categoriaFiltro === 'todos' || p.categoria === estado.categoriaFiltro;
        const atendeBusca = p.nome.toLowerCase().includes(estado.termoBusca.toLowerCase());
        return atendeCategoria && atendeBusca;
    });

    const htmlDestaques = (estado.categoriaFiltro === 'todos' && !estado.termoBusca) ? `
        <section class="destaques-section">
            <div class="destaques-header-wrapper">
                <div class="destaques-header">
                    <h2 class="secao-titulo">🔥 Destaques da Semana</h2>
                    <p class="destaques-subtitulo">Confira os itens mais procurados da semana</p>
                </div>
                <div class="carrossel-controles">
                    <button class="btn-nav" id="prevBtn" aria-label="Anterior">&#10094;</button>
                    <button class="btn-nav" id="nextBtn" aria-label="Próximo">&#10095;</button>
                </div>
            </div>

            <div class="carrossel-wrapper">
                <div class="carrossel-track" id="carrosselTrack">
                    ${produtosDestaque.map(p => {
                        const semEstoque = p.estoque <= 0;
                        return `
                            <article class="card ${semEstoque ? 'card-esgotado' : ''}">
                                <span class="badge-novo-card">EM ALTA</span>
                                <img src="${p.imagem}" class="imagem_produto" alt="${p.nome}" data-id="${p.id}">
                                <h3 class="titulo-produto" data-id="${p.id}">${p.nome}</h3>
                                ${renderPrecoHTML(p)}
                                <button class="btn-comprar" data-id="${p.id}" ${semEstoque ? 'disabled' : ''}>
                                    ${semEstoque ? 'Esgotado' : '⚡ Comprar'}
                                </button>
                            </article>
                        `;
                    }).join('')}
                </div>
            </div>
        </section>
        <h2 class="secao-titulo" style="margin-bottom: 20px;">🛒 Todos os Produtos</h2>
    ` : '';

    container.innerHTML = `
        ${htmlDestaques}
        <div class="cards">
            ${listaFiltrada.map(p => {
                const semEstoque = p.estoque <= 0;
                return `
                    <div class="card ${semEstoque ? 'card-esgotado' : ''}">
                        <img src="${p.imagem}" class="imagem_produto" alt="${p.nome}" data-id="${p.id}">
                        <h3 class="titulo-produto" data-id="${p.id}">${p.nome}</h3>
                        ${renderPrecoHTML(p)}
                        <small style="margin: 0 15px 10px; color: #a0a3c4;">
                            ${semEstoque ? 'Sem estoque disponível' : `Estoque: ${p.estoque} un.`}
                        </small>
                        <button class="btn-comprar" data-id="${p.id}" ${semEstoque ? 'disabled' : ''}>
                            ${semEstoque ? 'Esgotado' : 'Comprar'}
                        </button>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    // Eventos dos botões "Comprar"
    container.querySelectorAll('.btn-comprar').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.currentTarget.getAttribute('data-id'));
            adicionarAoCarrinho(id);
        });
    });

    // Evento de clique para abrir o Modal de Detalhes
    container.querySelectorAll('.imagem_produto, .titulo-produto').forEach(el => {
        el.style.cursor = 'pointer';
        el.addEventListener('click', (e) => {
            const id = parseInt(e.currentTarget.getAttribute('data-id'));
            const prod = produtos.find(p => p.id === id);
            if (prod) abrirModal(prod);
        });
    });

    if (estado.categoriaFiltro === 'todos' && !estado.termoBusca) {
        inicializarCarrossel();
    }
}

function renderCarrinho(container) {
    const carrinho = getCarrinho();
    const META_FRETE_GRATIS = 400;

    if (carrinho.length === 0) {
        container.innerHTML = `
            <div class="carrinho-vazio-box" style="text-align: center; padding: 40px 20px;">
                <h2>Seu carrinho está vazio! 😢</h2>
                <p style="color: var(--text-secondary); margin: 10px 0 20px;">Aproveite nossas ofertas e adicione seus colecionáveis favoritos.</p>
                <button class="btn" id="btnVoltarLoja" style="margin: 0 auto;">Ver Produtos</button>
            </div>
        `;
        document.getElementById('btnVoltarLoja')?.addEventListener('click', () => navegaPara('home'));
        return;
    }

    let subtotal = carrinho.reduce((acc, item) => acc + (item.preco * item.qtd), 0);
    const valorDesconto = subtotal * estado.descontoPercentual;
    const totalFinal = Math.max(0, subtotal - valorDesconto + estado.freteValor);

    const faltamFrete = META_FRETE_GRATIS - subtotal;
    const pctFrete = Math.min(100, (subtotal / META_FRETE_GRATIS) * 100);

    container.innerHTML = `
        <div class="carrinho-page">
            <div class="carrinho-header">
                <h1>Meu Carrinho de Compras</h1>
            </div>

            <div class="frete-progresso-card">
                <p>
                    ${subtotal >= META_FRETE_GRATIS
                        ? '🎉 Você ganhou <strong>FRETE GRÁTIS</strong>!'
                        : `🚚 Falta apenas <strong>R$ ${faltamFrete.toFixed(2).replace('.', ',')}</strong> para Frete Grátis!`}
                </p>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width: ${pctFrete}%;"></div>
                </div>
            </div>

            <div class="carrinho-grid">
                <section class="carrinho-itens-card">
                    ${carrinho.map(item => `
                        <div class="carrinho-item">
                            <img src="${item.imagem}" alt="${item.nome}">
                            <div class="item-detalhes">
                                <h4>${item.nome}</h4>
                                <p>R$ ${item.preco.toFixed(2).replace('.', ',')}</p>
                            </div>
                            <div class="item-qtd-control">
                                <button class="btn-qtd qtd-menos" data-id="${item.id}">-</button>
                                <span>${item.qtd}</span>
                                <button class="btn-qtd qtd-mais" data-id="${item.id}">+</button>
                            </div>
                            <button class="btn-remover-item" data-id="${item.id}" title="Remover item">🗑️</button>
                        </div>
                    `).join('')}
                </section>

                <aside class="resumo-card">
                    <h2>Resumo do Pedido</h2>
                    
                    <div class="box-calculo">
                        <label for="cupomInput">Cupom de Desconto</label>
                        <div class="input-btn-group">
                            <input type="text" id="cupomInput" value="${estado.cupomCodigo}" placeholder="Ex: GEEK10">
                            <button type="button" id="btnCupom">Aplicar</button>
                        </div>
                    </div>

                    <div class="box-calculo">
                        <label for="cepInput">Calcular Frete (CEP)</label>
                        <div class="input-btn-group">
                            <input type="text" id="cepInput" value="${estado.cepDigitado}" placeholder="00000-000" maxlength="9">
                            <button type="button" id="btnFrete">Calcular</button>
                        </div>
                    </div>

                    <div class="resumo-detalhes">
                        <div class="resumo-linha">
                            <span>Subtotal:</span>
                            <span>R$ ${subtotal.toFixed(2).replace('.', ',')}</span>
                        </div>
                        ${estado.descontoPercentual > 0 ? `
                            <div class="resumo-linha" style="color: #00e676;">
                                <span>Desconto (${estado.descontoPercentual * 100}%):</span>
                                <span>- R$ ${valorDesconto.toFixed(2).replace('.', ',')}</span>
                            </div>
                        ` : ''}
                        <div class="resumo-linha">
                            <span>Frete:</span>
                            <span>${estado.freteValor > 0 ? `R$ ${estado.freteValor.toFixed(2).replace('.', ',')}` : 'Grátis / Não calculado'}</span>
                        </div>
                        <div class="resumo-linha linha-total">
                            <span>Total:</span>
                            <span>R$ ${totalFinal.toFixed(2).replace('.', ',')}</span>
                        </div>
                    </div>

                    <button class="btn-finalizar" id="btnFinalizar">Finalizar Compra</button>
                </aside>
            </div>
        </div>
    `;

    // Controles de quantidade
    container.querySelectorAll('.qtd-mais').forEach(b => b.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        const prod = produtos.find(p => p.id === id);
        let carrinhoLocal = getCarrinho();
        const item = carrinhoLocal.find(i => i.id === id);

        if (item && prod) {
            if (item.qtd < prod.estoque) {
                item.qtd += 1;
                salvarCarrinho(carrinhoLocal);
                render();
            } else {
                exibirToast("⚠️ Limite de estoque atingido!");
            }
        }
    }));

    container.querySelectorAll('.qtd-menos').forEach(b => b.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        let carrinhoLocal = getCarrinho();
        const item = carrinhoLocal.find(i => i.id === id);

        if (item) {
            if (item.qtd > 1) {
                item.qtd -= 1;
            } else {
                carrinhoLocal = carrinhoLocal.filter(i => i.id !== id);
            }
            salvarCarrinho(carrinhoLocal);
            render();
        }
    }));

    container.querySelectorAll('.btn-remover-item').forEach(b => b.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        let carrinhoLocal = getCarrinho();
        carrinhoLocal = carrinhoLocal.filter(i => i.id !== id);
        salvarCarrinho(carrinhoLocal);
        exibirToast("Item removido do carrinho");
        render();
    }));

    // Cupom
    document.getElementById('btnCupom')?.addEventListener('click', () => {
        const inputVal = document.getElementById('cupomInput').value.trim().toUpperCase();
        estado.cupomCodigo = inputVal;
        if (inputVal === 'GEEK10') {
            estado.descontoPercentual = 0.10;
            exibirToast('🎉 Cupom GEEK10 aplicado (10% OFF)!');
        } else {
            estado.descontoPercentual = 0;
            exibirToast('❌ Cupom inválido! Tente "GEEK10".');
        }
        render();
    });

    // Frete
    document.getElementById('btnFrete')?.addEventListener('click', () => {
        const cepInput = document.getElementById('cepInput');
        const cep = cepInput ? cepInput.value.replace(/\D/g, '') : '';
        estado.cepDigitado = cepInput ? cepInput.value : '';

        if (cep.length === 8) {
            estado.freteValor = subtotal >= META_FRETE_GRATIS ? 0 : 15.00;
            exibirToast(`🚚 Frete calculado para ${cep}!`);
        } else {
            exibirToast('⚠️ Digite um CEP válido com 8 números.');
        }
        render();
    });

    // Finalizar
    document.getElementById('btnFinalizar')?.addEventListener('click', () => {
        let carrinhoAtual = getCarrinho();

        const produtosAtualizados = produtos.map(prod => {
            const itemComprado = carrinhoAtual.find(item => item.id === prod.id);
            if (itemComprado) {
                const novoEstoque = Math.max(0, prod.estoque - itemComprado.qtd);
                return { ...prod, estoque: novoEstoque };
            }
            return prod;
        });

        salvarProdutos(produtosAtualizados);
        exibirToast('🎉 Pedido realizado com sucesso!');

        estado.descontoPercentual = 0;
        estado.cupomCodigo = '';
        estado.freteValor = 0;
        estado.cepDigitado = '';
        salvarCarrinho([]);
        navegaPara('home');
    });
}

// Helper para recuperar histórico de pedidos salvos
function getHistoricoPedidos() {
    return JSON.parse(localStorage.getItem("pedidos_hub")) || [];
}

// ==========================================
// MÓDULO DE AUTENTICAÇÃO E CONTA
// ==========================================

// Helpers de dados do usuário e pedidos
function getHistoricoPedidos() {
    return JSON.parse(localStorage.getItem("pedidos_hub")) || [];
}

function salvarUsuario(usuario) {
    localStorage.setItem("usuario_logado", JSON.stringify(usuario));
}

function fazerLogout() {
    localStorage.removeItem("usuario_logado");
    if (typeof estado !== 'undefined') estado.modoAutenticacao = 'login';
    exibirToast("👋 Você saiu da sua conta.");
    render();
}

function renderCadastro(container) {
    const usuario = typeof getUsuarioLogado === 'function' ? getUsuarioLogado() : JSON.parse(localStorage.getItem("usuario_logado"));

    // -------------------------------------------------------------
    // VISÃO 1: USUÁRIO LOGADO
    // -------------------------------------------------------------
    if (usuario) {
        const pedidos = getHistoricoPedidos();
        const iniciais = usuario.nome ? usuario.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : 'U';
        const pontosFidelidade = pedidos.length * 100 + 50;

        container.innerHTML = `
            <div class="cadastro-wrapper" style="max-width: 900px; margin: 0 auto; padding: 20px;">
                <h1>👤 Minha Conta</h1>

                <div class="conta-grid">
                    <!-- CARD PERFIL -->
                    <div class="conta-card">
                        <div>
                            <div class="perfil-header-box">
                                <div class="avatar-circulo">${iniciais}</div>
                                <div>
                                    <h3 style="margin: 0; font-size: 1.2rem;">${usuario.nome}</h3>
                                    <p style="color: #a0a3c4; margin: 2px 0 0; font-size: 0.9rem;">${usuario.email}</p>
                                    <span class="badge-fidelidade">⭐ Nível Geek Silver</span>
                                </div>
                            </div>
                            <hr style="border: 0; border-top: 1px solid #2b2b3d; margin: 20px 0 15px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span>Pontos acumulados:</span>
                                <strong style="color: #6c5ce7; font-size: 1.1rem;">${pontosFidelidade} pts</strong>
                            </div>
                        </div>
                    </div>

                    <!-- CARD AÇÕES RÁPIDAS -->
                    <div class="conta-card">
                        <div>
                            <h2 style="font-size: 1.1rem; margin: 0;">🚀 Ações Rápidas</h2>
                            <div class="acoes-lista">
                                <button class="btn" id="btnContaIrConfig" style="background: #2b2b3d; text-align: left; width: 100%;">⚙️ Configurações & Endereços</button>
                                <button class="btn" id="btnContaIrCarrinho" style="background: #2b2b3d; text-align: left; width: 100%;">🛒 Ver Meu Carrinho</button>
                                <button id="btnSair" class="btn" style="background: #ff5252; width: 100%;">🚪 Sair da Conta</button>
                            </div>
                        </div>
                    </div>

                    <!-- CARD HISTÓRICO DE PEDIDOS -->
                    <div class="conta-card conta-card-full">
                        <div>
                            <h2 style="font-size: 1.1rem; margin: 0 0 10px;">📦 Histórico de Pedidos</h2>
                            <div>
                                ${pedidos.length === 0 ? `
                                    <p style="color: #a0a3c4; margin-top: 10px;">Você ainda não realizou nenhum pedido.</p>
                                ` : pedidos.map(p => `
                                    <div class="pedido-item">
                                        <div>
                                            <strong>#${p.id}</strong> - <small style="color: #a0a3c4;">${p.data}</small>
                                            <div style="font-size: 0.85rem; color: #a0a3c4; margin-top: 2px;">
                                                ${p.totalItens} item(ns) | Total: R$ ${Number(p.valorTotal).toFixed(2).replace('.', ',')}
                                            </div>
                                        </div>
                                        <span class="status-tag status-entregue">${p.status || 'Concluído'}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('btnSair')?.addEventListener('click', fazerLogout);
        document.getElementById('btnContaIrConfig')?.addEventListener('click', () => navegaPara('configuracoes'));
        document.getElementById('btnContaIrCarrinho')?.addEventListener('click', () => navegaPara('carrinho'));
        return;
    }

    // -------------------------------------------------------------
    // VISÃO 2: USUÁRIO NÃO LOGADO (LOGIN / CADASTRO)
    // -------------------------------------------------------------
    const isLogin = estado.modoAutenticacao === 'login';

    container.innerHTML = `
        <div class="cadastro-wrapper" style="max-width: 450px; margin: 0 auto; padding: 20px;">
            <div class="cadastro-box" style="background: var(--bg-card, #1e1e2d); padding: 30px; border-radius: 12px; border: 1px solid #2b2b3d;">
                <div style="display: flex; gap: 10px; margin-bottom: 20px; justify-content: center;">
                    <button type="button" id="tabLogin" class="btn" style="background: ${isLogin ? '#6c5ce7' : 'transparent'}; border: 1px solid #6c5ce7; flex: 1;">Login</button>
                    <button type="button" id="tabCadastro" class="btn" style="background: ${!isLogin ? '#6c5ce7' : 'transparent'}; border: 1px solid #6c5ce7; flex: 1;">Cadastrar</button>
                </div>

                <h1 style="font-size: 1.5rem; text-align: center; margin-bottom: 20px;">${isLogin ? 'Acessar Conta' : 'Crie sua Conta'}</h1>

                <form id="authForm">
                    ${!isLogin ? `
                        <div class="campo" style="margin-bottom: 15px;">
                            <label for="nome" style="display: block; margin-bottom: 5px;">Nome Completo</label>
                            <input type="text" id="nome" placeholder="Digite seu nome" required style="width: 100%; padding: 10px; border-radius: 6px; background: #2b2b3d; color: #fff; border: 1px solid #3f3f5a;">
                        </div>
                    ` : ''}

                    <div class="campo" style="margin-bottom: 15px;">
                        <label for="email" style="display: block; margin-bottom: 5px;">E-mail</label>
                        <input type="email" id="email" placeholder="seuemail@exemplo.com" required style="width: 100%; padding: 10px; border-radius: 6px; background: #2b2b3d; color: #fff; border: 1px solid #3f3f5a;">
                    </div>

                    <div class="campo" style="margin-bottom: 15px;">
                        <label for="senha" style="display: block; margin-bottom: 5px;">Senha</label>
                        <input type="password" id="senha" placeholder="••••••••" required minlength="6" style="width: 100%; padding: 10px; border-radius: 6px; background: #2b2b3d; color: #fff; border: 1px solid #3f3f5a;">
                    </div>

                    ${!isLogin ? `
                        <div class="campo" style="margin-bottom: 15px;">
                            <label for="confirmarSenha" style="display: block; margin-bottom: 5px;">Confirmar Senha</label>
                            <input type="password" id="confirmarSenha" placeholder="••••••••" required style="width: 100%; padding: 10px; border-radius: 6px; background: #2b2b3d; color: #fff; border: 1px solid #3f3f5a;">
                        </div>
                    ` : ''}

                    <button type="submit" class="btn" style="width: 100%; margin-top: 15px; padding: 12px; background: #6c5ce7; font-weight: bold;">
                        ${isLogin ? 'Entrar' : 'Cadastrar'}
                    </button>
                </form>
            </div>
        </div>
    `;

    document.getElementById('tabLogin')?.addEventListener('click', () => { estado.modoAutenticacao = 'login'; render(); });
    document.getElementById('tabCadastro')?.addEventListener('click', () => { estado.modoAutenticacao = 'cadastro'; render(); });

    document.getElementById('authForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();

        if (isLogin) {
            const nomeExtraido = email.split('@')[0];
            const nomeFormatado = nomeExtraido.charAt(0).toUpperCase() + nomeExtraido.slice(1);
            salvarUsuario({ nome: nomeFormatado, email });
            exibirToast(`Bem-vindo(a) de volta, ${nomeFormatado}!`);
        } else {
            const nome = document.getElementById('nome').value.trim();
            const s1 = document.getElementById('senha').value;
            const s2 = document.getElementById('confirmarSenha').value;

            if (s1 !== s2) {
                exibirToast('❌ As senhas não coincidem!');
                return;
            }

            salvarUsuario({ nome, email });
            exibirToast(`Bem-vindo(a), ${nome}!`);
        }

        navegaPara('home');
    });
}

// ==========================================
// CONFIGURAÇÕES EXPANDIDAS COM ACESSIBILIDADE E PAGAMENTO
// ==========================================
function getConfiguracoes() {
    return JSON.parse(localStorage.getItem("config_hub")) || {
        tema: 'dark',
        notificacoesToast: true,
        notificacoesEmail: true,
        fonteGrande: false,
        moeda: 'BRL',
        cepPadrao: '',
        enderecoPadrao: '',
        metodoPagamento: 'pix'
    };
}

function salvarConfiguracoes(config) {
    localStorage.setItem("config_hub", JSON.stringify(config));
    aplicarTema(config.tema);
    aplicarAcessibilidade(config.fonteGrande);
}

function aplicarAcessibilidade(fonteGrande) {
    if (fonteGrande) {
        document.documentElement.style.fontSize = '18px';
    } else {
        document.documentElement.style.fontSize = '16px';
    }
}

function renderConfiguracoes(container) {
    const usuario = getUsuarioLogado();
    const config = getConfiguracoes();

    container.innerHTML = `
        <div class="config-wrapper" style="max-width: 900px; margin: 0 auto; padding: 20px;">
            <h1>⚙️ Painel de Configurações</h1>
            
            <div class="config-grid">
                <!-- CARD 1: APARÊNCIA & ACESSIBILIDADE -->
                <div class="config-card">
                    <div>
                        <h2>🎨 Aparência & Acessibilidade</h2>
                        <div class="config-form-group">
                            <label for="selectTema">Tema Visual</label>
                            <select id="selectTema">
                                <option value="dark" ${config.tema === 'dark' ? 'selected' : ''}>🌙 Modo Escuro</option>
                                <option value="light" ${config.tema === 'light' ? 'selected' : ''}>☀️ Modo Claro</option>
                            </select>
                        </div>
                        <div class="campo-checkbox" style="margin-bottom: 10px;">
                            <input type="checkbox" id="chkToast" ${config.notificacoesToast ? 'checked' : ''}>
                            <label for="chkToast">Exibir notificações flutuantes</label>
                        </div>
                        <div class="campo-checkbox">
                            <input type="checkbox" id="chkFonte" ${config.fonteGrande ? 'checked' : ''}>
                            <label for="chkFonte">Aumentar fonte (Acessibilidade)</label>
                        </div>
                    </div>
                </div>

                <!-- CARD 2: COMUNICAÇÃO -->
                <div class="config-card">
                    <div>
                        <h2>🔔 Notificações</h2>
                        <div class="campo-checkbox">
                            <input type="checkbox" id="chkEmail" ${config.notificacoesEmail ? 'checked' : ''}>
                            <label for="chkEmail">Receber novidades e cupons por e-mail</label>
                        </div>
                    </div>
                </div>

                <!-- CARD 3: PAGAMENTO E ENTREGA -->
                <div class="config-card">
                    <form id="formPreferenciasCompra">
                        <h2>💳 Pagamento & Entrega</h2>
                        <div class="config-form-group">
                            <label for="configCep">CEP Padrão</label>
                            <input type="text" id="configCep" value="${config.cepPadrao || ''}" placeholder="00000-000" maxlength="9">
                        </div>
                        <div class="config-form-group">
                            <label for="configEndereco">Endereço de Entrega</label>
                            <input type="text" id="configEndereco" value="${config.enderecoPadrao || ''}" placeholder="Rua, Nº, Bairro">
                        </div>
                        <div class="config-form-group">
                            <label for="selectPagamento">Pagamento Preferido</label>
                            <select id="selectPagamento">
                                <option value="pix" ${config.metodoPagamento === 'pix' ? 'selected' : ''}>⚡ PIX</option>
                                <option value="cartao" ${config.metodoPagamento === 'cartao' ? 'selected' : ''}>💳 Cartão de Crédito</option>
                                <option value="boleto" ${config.metodoPagamento === 'boleto' ? 'selected' : ''}>📄 Boleto</option>
                            </select>
                        </div>
                        <button type="submit" class="btn">Salvar Preferências</button>
                    </form>
                </div>

                <!-- CARD 4: PERFIL -->
                <div class="config-card">
                    <div>
                        <h2>👤 Perfil e Segurança</h2>
                        ${usuario ? `
                            <form id="formAtualizarPerfil" class="config-form-group">
                                <div>
                                    <label for="configNome">Nome de Exibição</label>
                                    <input type="text" id="configNome" value="${usuario.nome}" required>
                                </div>
                                <div>
                                    <label for="configEmail">E-mail</label>
                                    <input type="email" id="configEmail" value="${usuario.email}" required>
                                </div>
                                <div>
                                    <label for="configNovaSenha">Nova Senha</label>
                                    <input type="password" id="configNovaSenha" placeholder="Digite para alterar">
                                </div>
                                <button type="submit" class="btn">Atualizar Perfil</button>
                            </form>
                        ` : `
                            <p style="color: #a0a3c4; margin-bottom: 15px;">Conecte-se para alterar dados do perfil.</p>
                            <button class="btn" id="btnIrLoginConfig">Entrar</button>
                        `}
                    </div>
                </div>

                <!-- CARD 5: ZONA DE PERIGO (LARGURA TOTAL) -->
                <div class="config-card config-card-danger">
                    <h2>⚠️ Zona de Perigo</h2>
                    <p style="color: #a0a3c4; margin-bottom: 15px;">Restaura as configurações originais e apaga todos os dados locais salvos.</p>
                    <button type="button" id="btnResetarDados" class="btn" style="background: #ff5252; width: max-content;">Restaurar Padrões</button>
                </div>
            </div>
        </div>
    `;

    // Eventos
    document.getElementById('selectTema')?.addEventListener('change', (e) => {
        config.tema = e.target.value;
        salvarConfiguracoes(config);
        exibirToast(`Tema alterado para ${config.tema === 'dark' ? 'Modo Escuro' : 'Modo Claro'}`);
    });

    document.getElementById('chkToast')?.addEventListener('change', (e) => {
        config.notificacoesToast = e.target.checked;
        salvarConfiguracoes(config);
    });

    document.getElementById('chkFonte')?.addEventListener('change', (e) => {
        config.fonteGrande = e.target.checked;
        salvarConfiguracoes(config);
    });

    document.getElementById('chkEmail')?.addEventListener('change', (e) => {
        config.notificacoesEmail = e.target.checked;
        salvarConfiguracoes(config);
    });

    document.getElementById('formPreferenciasCompra')?.addEventListener('submit', (e) => {
        e.preventDefault();
        config.cepPadrao = document.getElementById('configCep').value.trim();
        config.enderecoPadrao = document.getElementById('configEndereco').value.trim();
        config.metodoPagamento = document.getElementById('selectPagamento').value;
        salvarConfiguracoes(config);
        exibirToast('Preferências salvas!');
    });

    document.getElementById('formAtualizarPerfil')?.addEventListener('submit', (e) => {
        e.preventDefault();
        salvarUsuario({
            nome: document.getElementById('configNome').value.trim(),
            email: document.getElementById('configEmail').value.trim()
        });
        exibirToast('Perfil atualizado!');
        render();
    });

    document.getElementById('btnIrLoginConfig')?.addEventListener('click', () => navegaPara('cadastro'));

    document.getElementById('btnResetarDados')?.addEventListener('click', () => {
        if (confirm('Tem certeza de que deseja apagar todos os dados salvos?')) {
            localStorage.clear();
            location.reload();
        }
    });
}

// ==========================================
// 10. INICIALIZAÇÃO DA APLICAÇÃO
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    aplicarAcessibilidade(getConfiguracoes().fonteGrande);
    aplicarTema(getConfiguracoes().tema);
    atualizarUIHeader();

    // Eventos do Header
    document.getElementById('logoLink')?.addEventListener('click', (e) => { e.preventDefault(); navegaPara('home'); });
    document.getElementById('btnIrCarrinho')?.addEventListener('click', () => navegaPara('carrinho'));
    document.getElementById('btnIrCadastro')?.addEventListener('click', () => navegaPara('cadastro'));
    document.getElementById('btnIrConfig')?.addEventListener('click', () => navegaPara('configuracoes'));

    // Fechar Modal de Produto
    document.getElementById('btnFecharModal')?.addEventListener('click', fecharModal);
    document.getElementById('modalProduto')?.addEventListener('click', (e) => {
        if (e.target.id === 'modalProduto') fecharModal();
    });

    // Menu Sidebar Mobile
    const sidebar = document.getElementById('sidebar');
    const menuOverlay = document.getElementById('menuOverlay');

    const fecharMenu = () => {
        sidebar?.classList.remove('active');
        menuOverlay?.classList.remove('active');
    };

    document.getElementById('menuToggle')?.addEventListener('click', () => {
        sidebar?.classList.add('active');
        menuOverlay?.classList.add('active');
    });

    document.getElementById('menuClose')?.addEventListener('click', fecharMenu);
    document.getElementById('menuOverlay')?.addEventListener('click', fecharMenu);

    // Navegação por Categorias
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            estado.categoriaFiltro = link.getAttribute('data-categoria');
            fecharMenu();
            navegaPara('home');
        });
    });

    // Carregar Produtos
    carregarProdutos();
});