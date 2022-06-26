"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const apiKey = '3f301be7381a03ad8d352314dcc3ec1d';
let requestToken;
let sessionId;
let loadingTimeout;
let selectedMovie;
let selectedPlaylist;
const STATE_SEARCH = 0;
const STATE_MYLISTS = 1;
let global_state = STATE_SEARCH;
const lastSearch = [];
const playlists = [];
class Playlist {
    constructor(id, name) {
        this.filmes = [];
        this.id = id;
        this.name = name;
    }
    atualizarFilmes() {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield pegarLista(this.id);
            this.filmes.length = 0;
            if (response && response.items) {
                for (let i = 0; i < response.items.length; i++) {
                    const movie = response.items[i];
                    this.filmes.push(new Filme(movie.id, movie.title, movie.release_date, movie.overview, movie.poster_path, movie.genre_ids));
                }
            }
        });
    }
    containsMovie(filme) {
        for (let i = 0; i < this.filmes.length; i++) {
            if (this.filmes[i].id == filme.id) {
                return true;
            }
        }
        return false;
    }
    static atualizarPlaylists() {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            const response = yield pegarListas();
            playlists.length = 0;
            if (response && response.results) {
                for (let i = 0; i < response.results.length; i++) {
                    const pl = response.results[i];
                    const playlist = new Playlist(pl.id, pl.name);
                    yield playlist.atualizarFilmes();
                    playlists.push(playlist);
                }
                return resolve(true);
            }
            resolve(false);
        }));
    }
}
class Filme {
    constructor(id, title, lancamento, sinopse, poster, genre_ids) {
        this.generos = [];
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
    static getGeneroById(id) {
        for (let i = 0; i < Filme.generos.length; i++) {
            if (Filme.generos[i].id == id) {
                return Filme.generos[i].name;
            }
        }
        return null;
    }
}
const loginButton = document.getElementById('login-button');
const searchButton = document.getElementById('search-button');
const searchContainer = document.getElementById('search-container');
const btnBuscar = document.getElementById("btnBuscar");
const btnMinhasListas = document.getElementById("btnMinhasListas");
const btnNovaPlaylist = document.getElementById("btnNovaPlaylist");
const bodySearchContainer = document.getElementById("bodySearchContainer");
const bodyMyListsContainer = document.getElementById("bodyMyListsContainer");
let loginTimeOut;
loginButton.addEventListener('click', (e) => __awaiter(void 0, void 0, void 0, function* () {
    e.preventDefault();
    const username = document.getElementById('login').value;
    const password = document.getElementById('senha').value;
    login(username, password);
}));
class HttpClient {
    static get(obj) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                let { url, method, body } = obj;
                let request = new XMLHttpRequest();
                request.open(method, url, true);
                request.onload = () => {
                    if (request.status >= 200 && request.status < 300) {
                        resolve(JSON.parse(request.responseText));
                    }
                    else {
                        resolve({
                            status: request.status,
                            statusText: request.statusText
                        });
                    }
                };
                request.onerror = () => {
                    reject({
                        status: request.status,
                        statusText: request.statusText
                    });
                };
                if (body) {
                    request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
                    body = JSON.stringify(body);
                }
                request.send(body);
            });
        });
    }
}
function login(username, password) {
    return __awaiter(this, void 0, void 0, function* () {
        setLoading(true);
        yield criarRequestToken();
        const result = yield logar(username, password);
        if (result && result.success) {
            yield criarSessao();
            yield carregaGeneros();
            setLoading(false);
            document.getElementById("loginContainer").classList.add("esconder");
            document.getElementById("mainContainer").classList.remove("esconder");
            return;
        }
        setLoading(false);
        if (loginTimeOut) {
            clearTimeout(loginTimeOut);
        }
        const erroSpan = document.getElementById("erroMsg");
        erroSpan.innerText = "Usuário ou senha inválidos!";
        loginTimeOut = setTimeout(() => {
            erroSpan.innerText = '';
            clearTimeout();
        }, 5000);
    });
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
btnMinhasListas.addEventListener("click", () => __awaiter(void 0, void 0, void 0, function* () {
    if (!btnMinhasListas.classList.contains("selectedHeader")) {
        btnBuscar.classList.remove("selectedHeader");
        btnMinhasListas.classList.add("selectedHeader");
        bodyMyListsContainer.classList.remove("esconder");
        if (!bodySearchContainer.classList.contains("esconder")) {
            bodySearchContainer.classList.add("esconder");
        }
        global_state = STATE_MYLISTS;
        setLoading(true);
        yield Playlist.atualizarPlaylists();
        selectPlaylist(-1);
        setLoading(false);
    }
}));
btnNovaPlaylist.addEventListener("click", () => {
    showCriarPlaylistPopup();
});
searchButton.addEventListener('click', (event) => __awaiter(void 0, void 0, void 0, function* () {
    event.preventDefault();
    const resultList = document.getElementById("resultList");
    resultList.innerHTML = "";
    const inputSearch = document.getElementById('inputSearch');
    inputSearch.blur();
    const listaDeFilmes = yield procurarFilme(inputSearch.value);
    lastSearch.length = 0;
    if (listaDeFilmes.results) {
        listaDeFilmes.results.map((movie) => {
            lastSearch.push(new Filme(movie.id, movie.title, movie.release_date, movie.overview, movie.poster_path, movie.genre_ids));
        });
    }
    let innerHtml = "";
    if (lastSearch.length > 0) {
        innerHtml += `<span>${lastSearch.length} ${lastSearch.length == 1 ? "resultado" : "resultados"} referente a "${inputSearch.value}" ${lastSearch.length == 1 ? "encontrado" : "encontrados"}:</span>`;
    }
    else {
        innerHtml += `<span>Nenhum resultado referente à "${inputSearch.value}" foi encontrado!</span>`;
    }
    lastSearch.map((filme, index) => {
        innerHtml += `
        <div class="resultListItem" onclick='openLastSearchMovie(${index})'>
            ${filme.poster ? (`<img src="https://image.tmdb.org/t/p/w200${filme.poster}" alt="shrek poster"/>`) :
            `<div></div>`}
            <span>${filme.title}</span>
        </div>
        `;
    });
    inputSearch.value = "";
    resultList.innerHTML = innerHtml;
}));
login("diisk", "123456");
function setLoading(loading) {
    if (loadingTimeout) {
        clearTimeout(loadingTimeout);
    }
    if (loading) {
        const func = (state = 0) => {
            if (state > 3) {
                state = 0;
            }
            let msg = "Carregando";
            for (let i = 0; i < state; i++) {
                msg += " .";
            }
            showAlertPopup(msg);
            loadingTimeout = setTimeout(() => func(state + 1), 500);
        };
        func();
        return;
    }
    closePopup();
}
function atualizaMinhasListas() {
    const div = document.getElementById("playlistsDiv");
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
function criaPlaylistBtnCriar() {
    return __awaiter(this, void 0, void 0, function* () {
        const input = document.getElementById("inputPlaylistName");
        if (input.value.length == 0) {
            setCriarPlaylistError("Nome inválido!");
            return;
        }
        showAlertPopup("Criando playlist...");
        const response = yield criarPlaylist(input.value, "Lista criada por https://github.com/diisk/dio-ts-desafios");
        console.log(response);
        yield Playlist.atualizarPlaylists();
        showAlertPopup(`Playlist criada com sucesso <i class="fas fa-check" style="color:green"></i>`);
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
    });
}
function selectPlaylist(index) {
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
function showAlertPopup(message) {
    resetPopups();
    const popupContent = document.getElementById("popupContent");
    popupContent.classList.add("alertDiv");
    popupContent.innerHTML = `<span>${message}</span>`;
    setPopupScreen(true);
    setBlockScreen(true);
}
function openLastSearchMovie(id) {
    showMoviePopup(id);
}
function showCriarPlaylistPopup() {
    resetPopups();
    const popupContent = document.getElementById("popupContent");
    popupContent.classList.add("createPlaylistPopupDiv");
    popupContent.innerHTML = `
            <input type="text" id="inputPlaylistName" placeholder="Nome da Playlist"/>
            <span id="inputPlaylistNameError"></span>
            <div>
                <input type="submit" class="createPlaylistBtn" value="Criar" onclick='criaPlaylistBtnCriar()'/>
                <input type="button" class="createPlaylistBtn" value="Cancelar" onclick='criaPlaylistBtnCancelar()'/>
            </div>
    `;
    setPopupScreen(true);
    setBlockScreen(true);
}
let playlistErrorTimeout;
function setCriarPlaylistError(msg) {
    document.getElementById("inputPlaylistNameError").innerText = msg;
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
function addSelectedToPlaylist(playlistId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (selectedMovie) {
            showAlertPopup("Adicionando à playlist...");
            yield adicionarFilmeNaLista(selectedMovie.id, playlistId);
            yield Playlist.atualizarPlaylists();
            showAlertPopup(`Adicionado com sucesso <i class="fas fa-check" style="color:green"></i>`);
            setTimeout(() => {
                showChoosePlaylistsPopup(false);
            }, 2000);
        }
    });
}
function removeSelectedFromPlaylist(playlistId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (selectedMovie) {
            showAlertPopup("Removendo da playlist...");
            yield removerFilmeDaLista(selectedMovie.id, playlistId);
            yield Playlist.atualizarPlaylists();
            showAlertPopup(`Removido com sucesso <i class="fas fa-check" style="color:green"></i>`);
            setTimeout(() => {
                showChoosePlaylistsPopup(false);
            }, 2000);
        }
    });
}
function showChoosePlaylistsPopup(update = true) {
    return __awaiter(this, void 0, void 0, function* () {
        if (update) {
            setLoading(true);
            yield Playlist.atualizarPlaylists();
            setLoading(false);
        }
        resetPopups();
        const popupContent = document.getElementById("popupContent");
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
    <input type="button" value="X" onclick='closePopup();'>
            <div class="playlistDiv">
                <span>${playlists.length > 0 ?
            (playlists.length == 1 ?
                "1 playlist encontrada!" : `${playlists.length} playlists encontradas!`) : "Você não possui playlists criadas!"}</span>
                ${pls}
            </div>
            <div class="defaultButtonsDiv">
                <input type="button" value="+Playlist" onclick='showCriarPlaylistPopup()'>
            </div>
    `;
        setPopupScreen(true);
        setBlockScreen(true);
    });
}
function showMoviePopup(index, playlistIndex = -1) {
    let filme;
    let button = `<input type="button" value="Add/Remover" onclick='showChoosePlaylistsPopup();'>`;
    if (playlistIndex >= 0) {
        button = `<input type="button" value="Remover" onclick=''>`;
        filme = playlists[playlistIndex].filmes[index];
    }
    else {
        filme = lastSearch[index];
    }
    selectedMovie = filme;
    resetPopups();
    const popupContent = document.getElementById("popupContent");
    popupContent.classList.add("defaultPopupDiv");
    let generos = "";
    for (let i = 0; i < filme.generos.length; i++) {
        if (i != 0) {
            generos += ', ';
        }
        generos += filme.generos[i];
    }
    popupContent.innerHTML = `
    <input type="button" value="X" onclick='closePopup();'>
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
    const popupContent = document.getElementById("popupContent");
    popupContent.classList.remove("alertDiv");
    popupContent.classList.remove("defaultPopupDiv");
    popupContent.classList.remove("createPlaylistPopupDiv");
}
function closePopup() {
    setBlockScreen(false);
    setPopupScreen(false);
}
function setPopupScreen(showing) {
    const popup = document.getElementById("popupScreen");
    if (showing) {
        popup.classList.remove("esconder");
        return;
    }
    if (!popup.classList.contains("esconder")) {
        popup.classList.add("esconder");
    }
}
function setBlockScreen(showing) {
    const block = document.getElementById("blockScreen");
    if (showing) {
        block.classList.remove("esconder");
        return;
    }
    if (!block.classList.contains("esconder")) {
        block.classList.add("esconder");
    }
}
function validateLoginButton() {
    const username = document.getElementById('login').value;
    const password = document.getElementById('senha').value;
    if (password && username) {
        loginButton.disabled = false;
    }
    else {
        loginButton.disabled = true;
    }
}
carregaGeneros();
function procurarFilme(query) {
    return __awaiter(this, void 0, void 0, function* () {
        query = encodeURI(query);
        let result = yield HttpClient.get({
            url: `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&language=pt-BR&query=${query}`,
            method: "GET"
        });
        return result;
    });
}
function carregaGeneros() {
    return __awaiter(this, void 0, void 0, function* () {
        const result = yield HttpClient.get({
            url: `https://api.themoviedb.org/3/genre/movie/list?api_key=${apiKey}&language=pt-BR`,
            method: "GET"
        });
        if (result && result.genres) {
            Filme.generos = result.genres;
        }
    });
}
function criarRequestToken() {
    return __awaiter(this, void 0, void 0, function* () {
        let result = yield HttpClient.get({
            url: `https://api.themoviedb.org/3/authentication/token/new?api_key=${apiKey}`,
            method: "GET"
        });
        requestToken = result.request_token;
    });
}
function logar(username, password) {
    return __awaiter(this, void 0, void 0, function* () {
        let ret;
        try {
            ret = yield HttpClient.get({
                url: `https://api.themoviedb.org/3/authentication/token/validate_with_login?api_key=${apiKey}`,
                method: "POST",
                body: {
                    username: `${username}`,
                    password: `${password}`,
                    request_token: `${requestToken}`
                }
            });
        }
        catch (_a) { }
        ;
        return ret;
    });
}
function criarSessao() {
    return __awaiter(this, void 0, void 0, function* () {
        let result = yield HttpClient.get({
            url: `https://api.themoviedb.org/3/authentication/session/new?api_key=${apiKey}&request_token=${requestToken}`,
            method: "GET"
        });
        sessionId = result.session_id;
    });
}
function criarPlaylist(nomeDaLista, descricao) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield HttpClient.get({
            url: `https://api.themoviedb.org/3/list?api_key=${apiKey}&session_id=${sessionId}`,
            method: "POST",
            body: {
                name: nomeDaLista,
                description: descricao,
                language: "pt-br"
            }
        });
    });
}
function adicionarFilmeNaLista(filmeId, listaId) {
    return __awaiter(this, void 0, void 0, function* () {
        let result = yield HttpClient.get({
            url: `https://api.themoviedb.org/3/list/${listaId}/add_item?api_key=${apiKey}&session_id=${sessionId}`,
            method: "POST",
            body: {
                media_id: filmeId
            }
        });
    });
}
function removerFilmeDaLista(filmeId, listaId) {
    return __awaiter(this, void 0, void 0, function* () {
        let result = yield HttpClient.get({
            url: `https://api.themoviedb.org/3/list/${listaId}/remove_item?api_key=${apiKey}&session_id=${sessionId}`,
            method: "POST",
            body: {
                media_id: filmeId
            }
        });
    });
}
function pegarLista(listId) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield HttpClient.get({
            url: `https://api.themoviedb.org/3/list/${listId}?api_key=${apiKey}&language=pt-BR`,
            method: "GET"
        });
    });
}
function pegarListas() {
    return __awaiter(this, void 0, void 0, function* () {
        return yield HttpClient.get({
            url: `https://api.themoviedb.org/3/account/{account_id}/lists?api_key=${apiKey}&language=pt-BR&session_id=${sessionId}`,
            method: "GET"
        });
    });
}
function limparLista(listId) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield HttpClient.get({
            url: `https://api.themoviedb.org/3/list/${listId}/clear?api_key=${apiKey}&session_id=${sessionId}&confirm=true`,
            method: "POST"
        });
    });
}
function deletarLista(listId) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield HttpClient.get({
            url: `
        https://api.themoviedb.org/3/list/${listId}?api_key=${apiKey}&session_id=${sessionId}`,
            method: "POST"
        });
    });
}
