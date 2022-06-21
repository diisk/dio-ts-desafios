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
let username;
let password;
let sessionId;
let listId = '8207594';
let loginButton = document.getElementById('login-button');
let searchButton = document.getElementById('search-button');
let searchContainer = document.getElementById('search-container');
var loginTimeOut;
loginButton.addEventListener('click', () => __awaiter(void 0, void 0, void 0, function* () {
    yield criarRequestToken();
    const result = yield logar();
    if (result && result.success) {
        yield criarSessao();
        document.getElementById("loginContainer").classList.add("esconder");
        document.getElementById("mainContainer").classList.remove("esconder");
        return;
    }
    if (loginButton) {
        clearTimeout(loginTimeOut);
    }
    const erroSpan = document.getElementById("erroMsg");
    erroSpan.innerText = "Usuário ou senha inválidos!";
    loginTimeOut = setTimeout(() => {
        erroSpan.innerText = '';
        clearTimeout();
    }, 5000);
}));
searchButton.addEventListener('click', () => __awaiter(void 0, void 0, void 0, function* () {
    /*let lista = document.getElementById("lista");
    if (lista) {
        lista.outerHTML = "";
    }
    let query = (document.getElementById('search') as HTMLInputElement).value;
    let listaDeFilmes: any = await procurarFilme(query);
    let ul = document.createElement('ul');
    ul.id = "lista"
    for (const item of listaDeFilmes.results) {
        let li = document.createElement('li');
        li.appendChild(document.createTextNode(item.original_title))
        ul.appendChild(li)
    }
    console.log(listaDeFilmes);
    searchContainer.appendChild(ul);*/
}));
function preencherSenha() {
    password = document.getElementById('senha').value;
    validateLoginButton();
}
function preencherLogin() {
    username = document.getElementById('login').value;
    validateLoginButton();
}
function validateLoginButton() {
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
                        console.log(request.status);
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
                console.log(body);
                if (body) {
                    request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
                    body = JSON.stringify(body);
                }
                request.send(body);
            });
        });
    }
}
function procurarFilme(query) {
    return __awaiter(this, void 0, void 0, function* () {
        query = encodeURI(query);
        console.log(query);
        let result = yield HttpClient.get({
            url: `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${query}`,
            method: "GET"
        });
        return result;
    });
}
function adicionarFilme(filmeId) {
    return __awaiter(this, void 0, void 0, function* () {
        let result = yield HttpClient.get({
            url: `https://api.themoviedb.org/3/movie/${filmeId}?api_key=${apiKey}&language=en-US`,
            method: "GET"
        });
        console.log(result);
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
function logar() {
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
        console.log(sessionId);
        console.log(result);
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
        console.log(result);
    });
}
function pegarLista() {
    return __awaiter(this, void 0, void 0, function* () {
        let result = yield HttpClient.get({
            url: `https://api.themoviedb.org/3/list/${listId}?api_key=${apiKey}`,
            method: "GET"
        });
        console.log(result);
    });
}
