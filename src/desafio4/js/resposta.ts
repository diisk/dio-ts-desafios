const apiKey = '3f301be7381a03ad8d352314dcc3ec1d';
let requestToken: string;
let sessionId: string;

let loadingTimeout: number | undefined;

let selectedMovie: Filme | null;
let selectedPlaylist: Playlist | null;

const STATE_SEARCH = 0;
const STATE_MYLISTS = 1;

let global_state = STATE_SEARCH;

const lastSearch: Filme[] = [];
const playlists: Playlist[] = [];

type Genero = {
    id: number
    name: string
}

class Playlist {
    readonly id: number;
    readonly name: string;
    readonly filmes: Filme[] = []

    constructor(id: number, name: string) {
        this.id = id;
        this.name = name;
    }

    public async atualizarFilmes() {
        const response: any = await pegarLista(this.id);
        this.filmes.length = 0;
        if (response && response.items) {
            for (let i = 0; i < response.items.length; i++) {
                const movie = response.items[i];
                this.filmes.push(new Filme(
                    movie.id,
                    movie.title,
                    movie.release_date,
                    movie.overview,
                    movie.poster_path,
                    movie.genre_ids
                ));
            }
        }
    }

    public containsMovie(filme: Filme) {
        for (let i = 0; i < this.filmes.length; i++) {
            if (this.filmes[i].id == filme.id) {
                return true;
            }
        }
        return false;
    }

    public static atualizarPlaylists() {
        return new Promise(async (resolve, reject) => {
            const response: any = await pegarListas();
            playlists.length = 0;
            if (response && response.results) {
                for (let i = 0; i < response.results.length; i++) {
                    const pl = response.results[i];
                    const playlist = new Playlist(pl.id, pl.name);
                    await playlist.atualizarFilmes();
                    playlists.push(playlist);
                }
                return resolve(true);
            }
            resolve(false);
        });
    }
}

class Filme {
    public static generos: Genero[];

    readonly id: number;
    readonly title: string;
    readonly lancamento: Date;
    readonly sinopse?: string;
    readonly poster?: string;
    readonly generos: string[] = [];

    constructor(
        id: number,
        title: string,
        lancamento: string,
        sinopse?: string,
        poster?: string,
        genre_ids?: number[]
    ) {
        this.id = id;
        this.title = title;
        this.sinopse = sinopse;
        this.poster = poster;
        this.lancamento = new Date(lancamento);
        if (genre_ids) {
            for (let i = 0; i < genre_ids.length; i++) {
                const genero = Filme.getGeneroById(genre_ids[i]);
                if (genero) {
                    this.generos.push(genero);
                }
            }
        }
    }

    private static getGeneroById(id: number) {
        for (let i = 0; i < Filme.generos.length; i++) {
            if (Filme.generos[i].id == id) {
                return Filme.generos[i].name;
            }
        }
        return null;
    }

}


const loginButton = document.getElementById('login-button') as HTMLButtonElement;
const searchButton = document.getElementById('search-button') as HTMLButtonElement;
const searchContainer = document.getElementById('search-container') as HTMLDivElement;

const btnBuscar = document.getElementById("btnBuscar") as HTMLButtonElement;
const btnMinhasListas = document.getElementById("btnMinhasListas") as HTMLButtonElement;

const btnNovaPlaylist = document.getElementById("btnNovaPlaylist") as HTMLInputElement;

const btnLimparPlaylist = document.getElementById("btnLimparPlaylist") as HTMLInputElement;
const btnExcluirPlaylist = document.getElementById("btnExcluirPlaylist") as HTMLInputElement;

const bodySearchContainer = document.getElementById("bodySearchContainer") as HTMLElement;
const bodyMyListsContainer = document.getElementById("bodyMyListsContainer") as HTMLElement;


let loginTimeOut: number;
loginButton.addEventListener('click', async (e) => {
    e.preventDefault();
    const username = (document.getElementById('login') as HTMLInputElement).value;
    const password = (document.getElementById('senha') as HTMLInputElement).value;
    login(username, password);
});

class HttpClient {
    static async get(obj: { url: string, method: string, body?: any }) {
        return new Promise((resolve, reject) => {
            let { url, method, body } = obj;
            let request = new XMLHttpRequest();
            request.open(method, url, true);

            request.onload = () => {
                if (request.status >= 200 && request.status < 300) {
                    resolve(JSON.parse(request.responseText));
                } else {
                    resolve({
                        status: request.status,
                        statusText: request.statusText
                    })
                }
            }
            request.onerror = () => {
                reject({
                    status: request.status,
                    statusText: request.statusText
                })
            }

            if (body) {
                request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
                body = JSON.stringify(body);
            }
            request.send(body);

        })
    }
}

async function login(username: string, password: string) {
    setLoading(true);
    await criarRequestToken();
    const result: any = await logar(username, password);
    if (result && result.success) {
        await criarSessao();
        await carregaGeneros();
        setLoading(false);
        (document.getElementById("loginContainer") as HTMLDivElement).classList.add("esconder");
        (document.getElementById("mainContainer") as HTMLDivElement).classList.remove("esconder");
        return;
    }
    setLoading(false)
    if (loginTimeOut) {
        clearTimeout(loginTimeOut);
    }

    const erroSpan = document.getElementById("erroMsg") as HTMLSpanElement;
    erroSpan.innerText = "Usuário ou senha inválidos!";
    loginTimeOut = setTimeout(() => {
        erroSpan.innerText = '';
        clearTimeout();
    }, 5000);
}

btnBuscar.addEventListener("click", () => {
    if (!btnBuscar.classList.contains("selectedHeader")) {
        btnMinhasListas.classList.remove("selectedHeader");
        btnBuscar.classList.add("selectedHeader");
        bodySearchContainer.classList.remove("esconder");
        if (!bodyMyListsContainer.classList.contains("esconder")) {
            bodyMyListsContainer.classList.add("esconder");
        }
        global_state = STATE_SEARCH;
    }
});

btnLimparPlaylist.addEventListener("click",()=>{
    clearSelectedPlaylist();
});

btnExcluirPlaylist.addEventListener("click",()=>{
    deleteSelectedPlaylist();
});

btnMinhasListas.addEventListener("click", async () => {
    if (!btnMinhasListas.classList.contains("selectedHeader")) {
        btnBuscar.classList.remove("selectedHeader");
        btnMinhasListas.classList.add("selectedHeader");
        bodyMyListsContainer.classList.remove("esconder");
        if (!bodySearchContainer.classList.contains("esconder")) {
            bodySearchContainer.classList.add("esconder");
        }
        global_state = STATE_MYLISTS;
        setLoading(true);
        await Playlist.atualizarPlaylists();
        selectPlaylist(-1);
        setLoading(false);
    }
});

btnNovaPlaylist.addEventListener("click", () => {
    showCriarPlaylistPopup();
});



searchButton.addEventListener('click', async (event) => {
    event.preventDefault();
    const resultList = document.getElementById("resultList") as HTMLDivElement;
    resultList.innerHTML = "";
    const inputSearch = document.getElementById('inputSearch') as HTMLInputElement;
    inputSearch.blur();
    const listaDeFilmes: any = await procurarFilme(inputSearch.value);
    lastSearch.length = 0;
    if (listaDeFilmes.results) {
        listaDeFilmes.results.map((movie: any) => {
            lastSearch.push(new Filme(
                movie.id,
                movie.title,
                movie.release_date,
                movie.overview,
                movie.poster_path,
                movie.genre_ids
            ));
        });
    }
    let innerHtml = "";
    if (lastSearch.length > 0) {
        innerHtml += `<span>${lastSearch.length} ${lastSearch.length == 1 ? "resultado" : "resultados"} referente a "${inputSearch.value}" ${lastSearch.length == 1 ? "encontrado" : "encontrados"}:</span>`;
    } else {
        innerHtml += `<span>Nenhum resultado referente à "${inputSearch.value}" foi encontrado!</span>`;
    }
    lastSearch.map((filme, index) => {
        innerHtml += `
        <div class="resultListItem" onclick='openLastSearchMovie(${index})'>
            ${filme.poster ? (
                `<img src="https://image.tmdb.org/t/p/w200${filme.poster}" alt="shrek poster"/>`) :
                `<div></div>`}
            <span>${filme.title}</span>
        </div>
        `;
    });
    inputSearch.value = "";
    resultList.innerHTML = innerHtml;
})

login("diisk", "123456");

function setLoading(loading: boolean) {
    if (loadingTimeout) {
        clearTimeout(loadingTimeout);
    }
    if (loading) {
        const func = (state: number = 0) => {
            if (state > 3) {
                state = 0;
            }
            let msg = "Carregando";
            for (let i = 0; i < state; i++) {
                msg += " .";
            }
            showAlertPopup(msg);
            loadingTimeout = setTimeout(() => func(state + 1), 500);
        }
        func();
        return;
    }
    closePopup();
}

function atualizaMinhasListas() {
    const div = document.getElementById("playlistsDiv") as HTMLDivElement;
    if (playlists.length == 0) {
        div.innerHTML = "<span>Você não possui playlists!</span>";
        return;
    }
    let html = `<span>${playlists.length} ${playlists.length == 1 ? "playlist encontrada!" : "playlists encontradas!"}</span>`;
    for (let i = 0; i < playlists.length; i++) {
        const pl = playlists[i];
        let movies = '';
        const selected = selectedPlaylist ? selectedPlaylist.id == pl.id : false;
        for (let j = 0; j < pl.filmes.length; j++) {
            const filme = pl.filmes[j];
            movies += `
            <div class="playlistItemMovie" onclick='showMoviePopup(${j},${i})'>
                <img src="https://image.tmdb.org/t/p/w200${filme.poster}" alt="poster_${filme.title}"/>
                <span>${filme.title}</span>
            </div>
            `;
        }
        html += `
        <div${selected ? ` class="selectedPlaylist"` : ''}>
            <div class="playlistItemInfo"${selected ? ` onclick='selectPlaylist(-1);'` : ` onclick='selectPlaylist(${i});'`}>
                <span>(${pl.filmes.length}) ${pl.name}</span>
                <i class="fas fa-${selected ? "minus" : "plus"}"></i>
            </div>
            ${movies}
        </div>
        `;
    }
    div.innerHTML = html;
}


function criaPlaylistBtnCancelar() {
    switch (global_state) {
        case STATE_SEARCH:
            showChoosePlaylistsPopup(false);
            break;
        case STATE_MYLISTS:
            closePopup();
            break;
    }
}

async function criaPlaylistBtnCriar() {
    const input = document.getElementById("inputPlaylistName") as HTMLInputElement;
    if (input.value.length == 0) {
        setCriarPlaylistError("Nome inválido!");
        return;
    }
    showAlertPopup("Criando playlist...");
    const response: any = await criarPlaylist(input.value, "Lista criada por https://github.com/diisk/dio-ts-desafios");
    if (response && response.success) {
        await Playlist.atualizarPlaylists();
        showAlertPopup(`Playlist criada com sucesso <i class="fas fa-check" style="color:green"></i>`);
    } else {
        showAlertPopup(`Ocorreu um erro <i class="fas fa-times" style="color:red"></i>`);
    }

    switch (global_state) {
        case STATE_SEARCH:
            setTimeout(() => {
                showChoosePlaylistsPopup(false);
            }, 2000);
            break;
        case STATE_MYLISTS:
            atualizaMinhasListas();
            setTimeout(() => {
                closePopup();
            }, 2000);
            break;
    }
}

function selectPlaylist(index: number) {
    selectedPlaylist = index == -1 ? null : playlists[index];
    selectedMovie = null;
    atualizaMinhasListas();
    [...document.getElementsByClassName("myListsFooterBtn")].map((btn) => {
        if (index == -1) {
            if (!btn.classList.contains("esconder")) {
                btn.classList.add("esconder");
            }
            return;
        }
        btn.classList.remove("esconder");
    });
}

function showConfirmPopup(msg: string) {
    return new Promise((resolve, reject) => {
        resetPopups();
        const popup = document.getElementById("popupContent") as HTMLDivElement;
        popup.classList.add("confirmPopup")
        popup.innerHTML = `
        <span>${msg}</span>
             <div>
                <input type="button" value="Sim" id="confirmPopupBtnSim"/>
                <input type="button" value="Não" id="confirmPopupBtnNao"/>
             </div>
        `;
        (document.getElementById("confirmPopupBtnSim") as HTMLInputElement)
            .addEventListener("click", () => {
                closePopup();
                resolve(true);
            });
        (document.getElementById("confirmPopupBtnNao") as HTMLInputElement)
            .addEventListener("click", () => {
                closePopup();
                resolve(false);
            });
        setPopupScreen(true);
        setBlockScreen(true);
    });
}

function showAlertPopup(message: string) {
    resetPopups();
    const popupContent = document.getElementById("popupContent") as HTMLDivElement;
    popupContent.classList.add("alertDiv")
    popupContent.innerHTML = `<span>${message}</span>`;
    setPopupScreen(true);
    setBlockScreen(true);
}

function openLastSearchMovie(id: number) {
    showMoviePopup(id);
}

function showCriarPlaylistPopup() {
    resetPopups();
    const popupContent = document.getElementById("popupContent") as HTMLDivElement;
    popupContent.classList.add("createPlaylistPopupDiv")
    popupContent.innerHTML = `
            <input type="text" id="inputPlaylistName" autocomplete="off" placeholder="Nome da Playlist"/>
            <span id="inputPlaylistNameError"></span>
            <div>
                <input type="submit" class="createPlaylistBtn" value="Criar" onclick='criaPlaylistBtnCriar()'/>
                <input type="button" class="createPlaylistBtn" value="Cancelar" onclick='criaPlaylistBtnCancelar()'/>
            </div>
    `;
    setPopupScreen(true);
    setBlockScreen(true);
}

let playlistErrorTimeout: number;

function setCriarPlaylistError(msg: string) {
    (document.getElementById("inputPlaylistNameError") as HTMLSpanElement).innerText = msg;
    console.log(document.getElementById("inputPlaylistNameError"));
    if (playlistErrorTimeout) {
        clearTimeout(playlistErrorTimeout);
    }
    setTimeout(() => {
        const input = document.getElementById("inputPlaylistNameError");
        if (input) {
            input.innerText = '';
        }
    }, 5000);
}

async function addSelectedToPlaylist(playlistId: number) {
    if (selectedMovie) {
        showAlertPopup("Adicionando à playlist...");
        await adicionarFilmeNaLista(selectedMovie.id, playlistId)
        await Playlist.atualizarPlaylists();
        showAlertPopup(`Adicionado com sucesso <i class="fas fa-check" style="color:green"></i>`);
        setTimeout(() => {
            showChoosePlaylistsPopup(false);
        }, 2000);
    }


}

async function removeSelectedFromPlaylist(playlistId: number = -1) {
    if (selectedMovie) {
        const msg = `Removido com sucesso <i class="fas fa-check" style="color:green"></i>`;
        showAlertPopup("Removendo da playlist...");
        if (playlistId == -1 && selectedPlaylist) {
            await removerFilmeDaLista(selectedMovie.id, selectedPlaylist.id);
            await Playlist.atualizarPlaylists();
            atualizaMinhasListas();
            showAlertPopup(msg);
            setTimeout(() => {
                closePopup();
            }, 2000);
            return;
        }

        await removerFilmeDaLista(selectedMovie.id, playlistId);
        await Playlist.atualizarPlaylists();

        showAlertPopup(msg);
        setTimeout(() => {
            showChoosePlaylistsPopup(false);
        }, 2000);
    }
}

async function clearSelectedPlaylist() {
    const result = await showConfirmPopup("Deseja limpar essa playlist?");
    if (result && selectedPlaylist) {
        showAlertPopup("Limpando playlist...");
        await limparLista(selectedPlaylist.id);
        await Playlist.atualizarPlaylists();
        atualizaMinhasListas();
        showAlertPopup(`Playlist limpa com sucesso <i class="fas fa-check" style="color:green"></i>`);
        setTimeout(() => {
            closePopup();
        }, 2000);
    }
}

async function deleteSelectedPlaylist() {
    const result = await showConfirmPopup("Deseja deletar essa playlist?");
    if (result && selectedPlaylist) {
        showAlertPopup("Deletando playlist...");
        await deletarLista(selectedPlaylist.id);
        await Playlist.atualizarPlaylists();
        selectPlaylist(-1);
        showAlertPopup(`Playlist deletada com sucesso <i class="fas fa-check" style="color:green"></i>`);
        setTimeout(() => {
            closePopup();
        }, 2000);
    }
}

async function showChoosePlaylistsPopup(update: boolean = true) {
    if (update) {
        setLoading(true)
        await Playlist.atualizarPlaylists();
        setLoading(false);
    }

    resetPopups();
    const popupContent = document.getElementById("popupContent") as HTMLDivElement;
    popupContent.classList.add("defaultPopupDiv");

    let pls = "";
    for (let i = 0; i < playlists.length; i++) {
        const p = playlists[i];
        if (selectedMovie && p.containsMovie(selectedMovie)) {
            pls += `
            <div onclick='removeSelectedFromPlaylist(${p.id})'>
                <span>${p.name}</span>
                <i class="fas fa-check"></i>
            </div>
        `;
            continue;
        }
        pls += `
        <div onclick='addSelectedToPlaylist(${p.id})'>
            <span>${p.name}</span>
        </div>
        `;
    }

    popupContent.innerHTML = `
    <button type="button" onclick='closePopup();'><i class="fas fa-times"></i></button>
            <div class="playlistDiv">
                <span>${playlists.length > 0 ?
            (
                playlists.length == 1 ?
                    "1 playlist encontrada!" : `${playlists.length} playlists encontradas!`
            ) : "Você não possui playlists criadas!"
        }</span>
                ${pls}
            </div>
            <div class="defaultButtonsDiv">
                <input type="button" value="+Playlist" onclick='showCriarPlaylistPopup()'>
            </div>
    `;
    setPopupScreen(true);
    setBlockScreen(true);
}

function showMoviePopup(index: number, playlistIndex: number = -1) {
    let filme;
    let button = `<input type="button" value="Add/Remover" onclick='showChoosePlaylistsPopup();'>`;
    if (playlistIndex >= 0) {
        button = `<input type="button" value="Remover" onclick='removeSelectedFromPlaylist();'>`;
        filme = playlists[playlistIndex].filmes[index];
    } else {
        filme = lastSearch[index];
    }
    selectedMovie = filme;
    resetPopups();
    const popupContent = document.getElementById("popupContent") as HTMLDivElement;
    popupContent.classList.add("defaultPopupDiv")
    let generos = "";
    for (let i = 0; i < filme.generos.length; i++) {
        if (i != 0) {
            generos += ', ';
        }
        generos += filme.generos[i];
    }

    popupContent.innerHTML = `
    <button type="button" onclick='closePopup();'><i class="fas fa-times"></i></button>
    <div class="movieInfos">
                <img src="https://image.tmdb.org/t/p/w200${filme.poster}" alt="poster_${filme.title}"/>
                <div>
                    <span>Nome:</span> ${filme.title}
                </div>
                <div>
                    <span>Data de Lançamento:</span> ${filme.lancamento.toLocaleDateString()}
                </div>
                <div>
                    <span>Gêneros:</span> ${generos}
                </div>
                <div>
                    <span>Sinopse:</span> ${filme.sinopse}
                </div>
            </div>
            <div class="defaultButtonsDiv">
                ${button}
            </div>
    `;
    setPopupScreen(true);
    setBlockScreen(true);
}

function resetPopups() {
    const popupContent = document.getElementById("popupContent") as HTMLDivElement;
    popupContent.classList.remove("alertDiv");
    popupContent.classList.remove("defaultPopupDiv");
    popupContent.classList.remove("createPlaylistPopupDiv");
}

function closePopup() {
    setBlockScreen(false);
    setPopupScreen(false);
}

function setPopupScreen(showing: boolean) {
    const popup = document.getElementById("popupScreen") as HTMLDivElement;
    if (showing) {
        popup.classList.remove("esconder");
        return;
    }
    if (!popup.classList.contains("esconder")) {
        popup.classList.add("esconder");
    }
}

function setBlockScreen(showing: boolean) {
    const block = document.getElementById("blockScreen") as HTMLDivElement;
    if (showing) {
        block.classList.remove("esconder");
        return;
    }
    if (!block.classList.contains("esconder")) {
        block.classList.add("esconder");
    }
}

function validateLoginButton() {
    const username = (document.getElementById('login') as HTMLInputElement).value;
    const password = (document.getElementById('senha') as HTMLInputElement).value;

    if (password && username) {
        loginButton.disabled = false;
    } else {
        loginButton.disabled = true;
    }
}

carregaGeneros();

async function procurarFilme(query: string) {
    query = encodeURI(query)
    let result = await HttpClient.get({
        url: `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&language=pt-BR&query=${query}`,
        method: "GET"
    })
    return result
}

async function carregaGeneros() {
    const result: any = await HttpClient.get({
        url: `https://api.themoviedb.org/3/genre/movie/list?api_key=${apiKey}&language=pt-BR`,
        method: "GET"
    })

    if (result && result.genres) {
        Filme.generos = result.genres;
    }
}

async function criarRequestToken() {
    let result: any = await HttpClient.get({
        url: `https://api.themoviedb.org/3/authentication/token/new?api_key=${apiKey}`,
        method: "GET"
    })
    requestToken = result.request_token
}

async function logar(username: string, password: string) {
    let ret: any;
    try {
        ret = await HttpClient.get({
            url: `https://api.themoviedb.org/3/authentication/token/validate_with_login?api_key=${apiKey}`,
            method: "POST",
            body: {
                username: `${username}`,
                password: `${password}`,
                request_token: `${requestToken}`
            }
        });
    } catch { };
    return ret;
}

async function criarSessao() {
    let result: any = await HttpClient.get({
        url: `https://api.themoviedb.org/3/authentication/session/new?api_key=${apiKey}&request_token=${requestToken}`,
        method: "GET"
    })
    sessionId = result.session_id;
}

async function criarPlaylist(nomeDaLista: string, descricao: string) {
    return await HttpClient.get({
        url: `https://api.themoviedb.org/3/list?api_key=${apiKey}&session_id=${sessionId}`,
        method: "POST",
        body: {
            name: nomeDaLista,
            description: descricao,
            language: "pt-br"
        }
    })
}

async function adicionarFilmeNaLista(filmeId: number, listaId: number) {
    let result = await HttpClient.get({
        url: `https://api.themoviedb.org/3/list/${listaId}/add_item?api_key=${apiKey}&session_id=${sessionId}`,
        method: "POST",
        body: {
            media_id: filmeId
        }
    })
}

async function removerFilmeDaLista(filmeId: number, listaId: number) {
    let result = await HttpClient.get({
        url: `https://api.themoviedb.org/3/list/${listaId}/remove_item?api_key=${apiKey}&session_id=${sessionId}`,
        method: "POST",
        body: {
            media_id: filmeId
        }
    })
}

async function pegarLista(listId: number) {
    return await HttpClient.get({
        url: `https://api.themoviedb.org/3/list/${listId}?api_key=${apiKey}&language=pt-BR`,
        method: "GET"
    })
}

async function pegarListas() {
    return await HttpClient.get({
        url: `https://api.themoviedb.org/3/account/{account_id}/lists?api_key=${apiKey}&language=pt-BR&session_id=${sessionId}`,
        method: "GET"
    })
}

async function limparLista(listId: number) {
    return await HttpClient.get({
        url: `https://api.themoviedb.org/3/list/${listId}/clear?api_key=${apiKey}&session_id=${sessionId}&confirm=true`,
        method: "POST"
    })
}

async function deletarLista(listId: number) {
    return await HttpClient.get({
        url: `
        https://api.themoviedb.org/3/list/${listId}?api_key=${apiKey}&session_id=${sessionId}`,
        method: "DELETE"
    })
}