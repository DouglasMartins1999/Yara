# Yara
> A primeira assistente virtual brasileira sobre bem-estar


<p align="center">
<img src="https://i.imgur.com/BAPykFD.png" alt="Yara" width="200" />
</p>


O atual projeto é um protótipo apresentado como MVP de um produto digital, voltado para as pessoas com pouca facilidade em utilizar interfaces gráficas, mas ainda assim vêem interesse em conteúdo digital sobre bem-estar. A Yara, assistente virtual criada para ajudar essas pessoas, atua como intermediária na obtenção desses conteúdos, tornando o acesso mais intuitivo ao empregar interfaces conversacionais em detrimento da interface gráfica - a qual pode ser significativamente complexa para algumas pessoas.

**Demonstração de funcionalidade**: https://www.youtube.com/watch?v=XL1xVOzDelQ



Atualmente, a Yara é capaz de dar dicas de receitas e informações sobre atividades físicas. O protótipo, construido por meio das ferramentas da Google: Dialogflow ES, Firebase e Google Assistant, pode ser implementado por qualquer pessoa com os arquivos aqui presentes. 

O arquivo `Projeto_CHB.zip` contém todas as entidades, intenções e contextos necessários para estabelecer a árvore de conversação do chatbot. Precisa ser importado em um novo agente do Dialogflow, antes de realizar as próximas etapas.

O arquivo `Receitas.json` corresponde a uma pequena base de dados de receitas, estruturada para ser utilizada junto com os parâmetros captados pelo Dialogflow, por meio das entidades definidas. Precisa ser importado em uma base de dados do *Realtime Database* do Firebase, e alterar as constantes dentro do arquivo `index.js`, incluindo a chave de acesso ao banco, bem como a URL disponibilizada pelo Firebase.

O código em JavaScript nesse repositório corresponde ao Webhook que atende solicitações mais complexas, precisa ser deplorado em algum servidor com suporte ao Node.JS, ou adaptado para utilizar o Google Cloud Functions, disponibilizado no próprio Dialogflow, através do recurso *Fulfillment*.
