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
const lastSearch = [];
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
const bodySearchContainer = document.getElementById("bodySearchContainer");
const bodyMyListsContainer = document.getElementById("bodyMyListsContainer");
let loginTimeOut;
loginButton.addEventListener('click', (e) => __awaiter(void 0, void 0, void 0, function* () {
    e.preventDefault();
    const username = document.getElementById('login').value;
    const password = document.getElementById('senha').value;
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
}));
btnBuscar.addEventListener("click", () => {
    if (!btnBuscar.classList.contains("selectedHeader")) {
        btnMinhasListas.classList.remove("selectedHeader");
        btnBuscar.classList.add("selectedHeader");
        bodySearchContainer.classList.remove("esconder");
        if (!bodyMyListsContainer.classList.contains("esconder")) {
            bodyMyListsContainer.classList.add("esconder");
        }
    }
});
btnMinhasListas.addEventListener("click", () => {
    if (!btnMinhasListas.classList.contains("selectedHeader")) {
        btnBuscar.classList.remove("selectedHeader");
        btnMinhasListas.classList.add("selectedHeader");
        bodyMyListsContainer.classList.remove("esconder");
        if (!bodySearchContainer.classList.contains("esconder")) {
            bodySearchContainer.classList.add("esconder");
        }
    }
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
        console.log(listaDeFilmes.results);
    }
    let innerHtml = "";
    if (lastSearch.length > 0) {
        innerHtml += `<span>${lastSearch.length} ${lastSearch.length == 1 ? "resultado" : "resultados"} referente a "${inputSearch.value}" ${lastSearch.length == 1 ? "encontrado" : "encontrados"}:</span>`;
    }
    else {
        innerHtml += `<span>Nenhum resultado referente à "${inputSearch.value}" foi encontrado!</span>`;
    }
    lastSearch.map((filme) => {
        innerHtml += `
        <div class="resultListItem">
            ${filme.poster ? (`<img src="https://image.tmdb.org/t/p/w200${filme.poster}" alt="shrek poster"/>`) :
            `<div></div>`}
            <span>${filme.title}</span>
        </div>
        `;
    });
    inputSearch.value = "";
    resultList.innerHTML = innerHtml;
}));
let loadingInterval;
function setLoading(loading) {
    setBlockScreen(loading);
    setPopupScreen(loading);
    if (loadingInterval) {
        clearInterval(loadingInterval);
        loadingInterval = undefined;
    }
    if (loading) {
        const alertMsg = document.getElementById("alertMsg");
        alertMsg.innerText = "Aguarde . . .";
        loadingInterval = setInterval(() => {
            if (alertMsg.innerText.length >= 13) {
                alertMsg.innerText = "Aguarde";
                return;
            }
            alertMsg.innerText += " .";
        }, 500);
    }
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
        console.log(Filme.generos);
    });
}
function adicionarFilme(filmeId) {
    return __awaiter(this, void 0, void 0, function* () {
        let result = yield HttpClient.get({
            url: `https://api.themoviedb.org/3/movie/${filmeId}?api_key=${apiKey}&language=en-US`,
            method: "GET"
        });
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
function criarLista(nomeDaLista, descricao) {
    return __awaiter(this, void 0, void 0, function* () {
        let result = yield HttpClient.get({
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
function pegarLista(listId) {
    return __awaiter(this, void 0, void 0, function* () {
        let result = yield HttpClient.get({
            url: `https://api.themoviedb.org/3/list/${listId}?api_key=${apiKey}`,
            method: "GET"
        });
    });
}
