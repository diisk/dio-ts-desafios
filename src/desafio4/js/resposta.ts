const apiKey = '3f301be7381a03ad8d352314dcc3ec1d';
let requestToken: string;
let sessionId: string;

const lastSearch: Filme[] = [];

type Genero = {
    id: number
    name: string
}
class Filme {
    public static generos: Genero[];

    id: number;
    title: string;
    lancamento: Date;
    sinopse?: string;
    poster?: string;
    generos: string[] = [];

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

const bodySearchContainer = document.getElementById("bodySearchContainer") as HTMLElement;
const bodyMyListsContainer = document.getElementById("bodyMyListsContainer") as HTMLElement;


let loginTimeOut: number;
loginButton.addEventListener('click', async (e) => {
    e.preventDefault();
    const username = (document.getElementById('login') as HTMLInputElement).value;
    const password = (document.getElementById('senha') as HTMLInputElement).value;
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
});

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
        console.log(listaDeFilmes.results);
    }
    let innerHtml = "";
    if (lastSearch.length > 0) {
        innerHtml += `<span>${lastSearch.length} ${lastSearch.length == 1 ? "resultado" : "resultados"} referente a "${inputSearch.value}" ${lastSearch.length == 1 ? "encontrado" : "encontrados"}:</span>`;
    } else {
        innerHtml += `<span>Nenhum resultado referente à "${inputSearch.value}" foi encontrado!</span>`;
    }
    lastSearch.map((filme) => {
        innerHtml += `
        <div class="resultListItem">
            ${filme.poster?(
                `<img src="https://image.tmdb.org/t/p/w200${filme.poster}" alt="shrek poster"/>`):
                `<div></div>`}
            <span>${filme.title}</span>
        </div>
        `;
    });
    inputSearch.value = "";
    resultList.innerHTML = innerHtml;
})


let loadingInterval: number | undefined;
function setLoading(loading: boolean) {
    setBlockScreen(loading);
    setPopupScreen(loading);
    if (loadingInterval) {
        clearInterval(loadingInterval);
        loadingInterval = undefined;
    }
    if (loading) {
        const alertMsg = document.getElementById("alertMsg") as HTMLSpanElement;
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
    console.log(Filme.generos);
}

async function adicionarFilme(filmeId: string) {
    let result = await HttpClient.get({
        url: `https://api.themoviedb.org/3/movie/${filmeId}?api_key=${apiKey}&language=en-US`,
        method: "GET"
    })
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

async function criarLista(nomeDaLista: string, descricao: string) {
    let result = await HttpClient.get({
        url: `https://api.themoviedb.org/3/list?api_key=${apiKey}&session_id=${sessionId}`,
        method: "POST",
        body: {
            name: nomeDaLista,
            description: descricao,
            language: "pt-br"
        }
    })
}

async function adicionarFilmeNaLista(filmeId: string, listaId: string) {
    let result = await HttpClient.get({
        url: `https://api.themoviedb.org/3/list/${listaId}/add_item?api_key=${apiKey}&session_id=${sessionId}`,
        method: "POST",
        body: {
            media_id: filmeId
        }
    })
}

async function pegarLista(listId: number) {
    let result = await HttpClient.get({
        url: `https://api.themoviedb.org/3/list/${listId}?api_key=${apiKey}`,
        method: "GET"
    })
}