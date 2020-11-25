const bodyParser = require("body-parser");
const express = require("express");
const server = express();

server.use(bodyParser.json())
server.post("/hook", handler);
server.listen(8080, () => console.log("Working!"));

// --------------------------------------------------------

const firebase = require("firebase");
const { WebhookClient } = require("dialogflow-fulfillment");

const apiKey = "INSIRA A APIKEY DE ACESSO AO FIREBASE";
const dbURL = "INSIRA A URL DO REALTIME DATABASE DO FIREBASE ONDE ESTÃO AS RECEITAS"

firebase.initializeApp({
	apiKey: process.env.APIKEY || apiKey,
	databaseURL: process.env.DBURL || dbURL,
});

function genContext(recipe) {
	return recipe.Receita.toLowerCase().replace(/[\W_]+/g, ".");
}

function parseContext(cntxs) {
	return cntxs.map(c => c.name).map(n => n.split("/").pop());
}

function parseStepContext(cntxs, name) {
	return cntxs
		.map(c => c.name)
		.map(n => n.split("/").pop())
		.filter(c => c.match(name) !== null)
		.map(m => m.split(".").pop())
		.map(m => parseInt(m))
		.pop();
}

function filterRecipes(recipes, params) {
	let selected = recipes;
	let { Refeicao, Vegetariana, CategoriaAlimento, BaixaCaloria, Ocasiao, Preparo } = params;
	
	if(BaixaCaloria) {
		selected = selected.filter(r => r['Baixa Calorias'] === true);
	}
	
	if(Vegetariana) {
		selected = selected.filter(r => r['Vegetariana'] === true);
	}
	
	if(CategoriaAlimento) {
		selected = selected.filter(r => r['Categoria'] === CategoriaAlimento || r['Categoria'] === null);
	}
	
	if(Refeicao) {
		selected = [
			...selected.filter(r => r['Refeição'] === Refeicao),
			...selected.filter(r => r['Refeição'] !== Refeicao)
		];
	}
	
	if(Ocasiao) {
		selected = [
			...selected.filter(r => r['Ocasião'] === Ocasiao),
			...selected.filter(r => r['Ocasião'] !== Ocasiao)
		];
	}
	
	return selected;
}

function handler(request, response) {
	const agent = new WebhookClient({ request, response });
	
	function foodpicker(agent) {
		const refs = firebase.database().ref();

		return refs.once("value")
			.then(snap => snap.val())
			.then(recipes => filterRecipes(recipes, agent.parameters))
			.then(recipes => {
				if(recipes.length) {
					const recipe = recipes[0];
					const msg = "Entendi! Que tal uma receita de " + recipe.Receita + "?";
					const cnxt = {
						lifespan: 3,
						name: genContext(recipe)
					};
					
					agent.add(msg);
					agent.context.set(cnxt);
				} else {
					agent.add("Entendi seu pedido, mas não consegui achar nada no meu livro para atender o que precisa. Desculpe.");
				}
			});
	}
	
	function foodIngredients(agent){
		const refs = firebase.database().ref();
		const contexts = parseContext(agent.contexts);
		
		return refs.once("value")
		.then(snap => snap.val())
		.then(recipes => recipes.find(r => contexts.includes(genContext(r))))
		.then(selected => {
			if(selected) {
				agent.add("Ok, vamos lá. Primeiro os ingredientes. Quando estiver pronto, vamos ao modo de preparo.");
				agent.add(selected.Ingredientes + ".");
			} else {
				agent.add("Ops. Houve um probleminha ao achar sua receita"); 
			}
		}); 
	}

	function foodHowToDo(agent) {
		const refs = firebase.database().ref();
		const contexts = parseContext(agent.contexts);
		const step = parseStepContext(agent.contexts, "step_alim");

		return refs.once("value")
			.then(snap => snap.val())
			.then(recipes => recipes.find(r => contexts.includes(genContext(r))))
			.then(selected => {
				if(selected){
					if (step) {
						if(selected["Modo de Preparo"][step]) {
							agent.add(selected["Modo de Preparo"][step]);

							agent.context.set({ name: genContext(selected), lifespan: 2 });
							agent.context.set({ name: "foodingredientsintent-followup", lifespan: 2 });
							agent.context.set({ name: `step_alim.${step + 1}`, lifespan: 1 });

						} else {
							agent.add("E é isso. Espero que aproveite sua refeição!")
						}
					} else {
						agent.add("Certo. Vamos preparar! Se não entender alguma coisa, pode falar que eu repito.");
						agent.add(selected["Modo de Preparo"][0]);

						agent.context.set({ name: genContext(selected), lifespan: 2 });
						agent.context.set({ name: "foodingredientsintent-followup", lifespan: 2 });
						agent.context.set({ name: "step_alim.01", lifespan: 1 });
					}
				} else {
					agent.add("Ainda não consegui encontrá-la. Talvez você possa pedir outra coisa. Que tal?");
					agent.context.set("defaultfoodintent-followup");
				}
			})
	}

	function foodRepeat(agent) {
		const refs = firebase.database().ref();
		const contexts = parseContext(agent.contexts);
		const step = parseStepContext(agent.contexts, "step_alim");

		return refs.once("value")
			.then(snap => snap.val())
			.then(recipes => recipes.find(r => contexts.includes(genContext(r))))
			.then(selected => {
				agent.add("Sem problemas! Vamos repetir:")
				agent.context.set({ name: "foodingredientsintent-followup", lifespan: 2 })
				agent.context.set({ name: genContext(selected), lifespan: 2 })

				if(!step) {
					agent.add(selected.Ingredientes + ".");
				} 

				else {
					agent.add(selected["Modo de Preparo"][step - 1]);
					agent.context.set({ name: `step_alim.${step}`, lifespan: 1 });
				}
			})
	}

	function foodBackward(agent) {
		const refs = firebase.database().ref();
		const contexts = parseContext(agent.contexts);
		const step = parseStepContext(agent.contexts, "step_alim");

		return refs.once("value")
			.then(snap => snap.val())
			.then(recipes => recipes.find(r => contexts.includes(genContext(r))))
			.then(selected => {
				agent.context.set({ name: "foodingredientsintent-followup", lifespan: 2 })
				agent.context.set({ name: genContext(selected), lifespan: 2 })
				
				if(!step || !selected["Modo de Preparo"][step - 2]) {
					agent.add("Claro, vamos voltar um passo. Esses são os ingredientes. Quando estiver pronto, vamos ao modo de preparo.");
					agent.add(selected.Ingredientes + ".");
				} 
				
				else {
					agent.add("Claro, vamos voltar um passo.");
					agent.add(selected["Modo de Preparo"][step - 2]);
					agent.context.set({ name: `step_alim.${step - 1}`, lifespan: 1 });
				}
			})
	}
	
	let intentMap = new Map();
	intentMap.set("Food Picker Intent", foodpicker);
	intentMap.set("Food Ingredients Intent", foodIngredients);
	intentMap.set("Food Maker Intent", foodHowToDo);
	intentMap.set("Food Ingredients Fallback", foodRepeat)
	intentMap.set("Food Backward Intent", foodBackward)
	agent.handleRequest(intentMap);
}