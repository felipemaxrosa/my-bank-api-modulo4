import express from "express";
import { accountModel } from "../models/accountModel.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const accounts = await accountModel.find();
    res.send(accounts);
  } catch (error) {
    res.status(500).send(error);
  }
});

router.patch("/deposit", async (req, res) => {
  const { agencia, conta, value } = req.body;
  try {
    const account = await accountModel.findOne({
      $and: [{ agencia: agencia }, { conta: conta }],
    });

    if (!account) {
      res.status(404).send("Documento nao encontrado na colecao");
      return;
    } else {
      try {
        const filter = { _id: account._id };
        const update = { balance: account.balance + value };
        const accountUpdated = await accountModel.findOneAndUpdate(
          filter,
          update,
          { new: true }
        );

        res.send(update);
      } catch (error) {
        res.send(`Erro na atualizacao do saldo: ${error.message}`);
      }
    }
  } catch (error) {
    res.status(500).send(error);
  }
});

router.patch("/withdraw", async (req, res) => {
  const { agencia, conta, value } = req.body;
  try {
    const account = await accountModel.findOne({
      $and: [{ agencia: agencia }, { conta: conta }],
    });

    if (!account) {
      res.status(404).send("Documento nao encontrado na colecao");
      return;
    } else {
      try {
        const filter = { _id: account._id };
        const update = { balance: account.balance - value - 1 };
        if (update.balance < 0) {
          res.send({ message: "Saldo insuficiente!" });
        } else {
          const accountUpdated = await accountModel.findOneAndUpdate(
            filter,
            update,
            { new: true }
          );

          res.send(update);
        }
      } catch (error) {
        res.send(`Erro na atualizacao do saldo: ${error.message}`);
      }
    }
  } catch (error) {
    res.status(500).send(error);
  }
});

router.get("/:agencia/:conta", async (req, res) => {
  const { agencia, conta } = req.params;
  try {
    const account = await accountModel.findOne({
      agencia: agencia,
      conta: conta,
    });
    if (!account) {
      res.status(404).send({ message: "Documento nao encontrado na colecao" });
    }

    res.send({ balance: account.balance });
  } catch (error) {
    res.status(500).send(error);
  }
});

router.delete("/:agencia/:conta", async (req, res) => {
  const { agencia, conta } = req.params;
  try {
    const account = await accountModel.findOneAndDelete({
      agencia: agencia,
      conta: conta,
    });
    if (!account) {
      res.status(404).send({ message: "Conta nao encontrado na colecao" });
    } else {
      const countAccounts = await accountModel
        .find({ agencia: agencia })
        .count();

      res.send({ countAccounts });
    }
  } catch (error) {
    res.status(500).send(error);
  }
});

router.patch("/transfer", async (req, res) => {
  const { contaOrigem, contaDestino, valor } = req.body;
  const tarifa = 8;
  try {
    const accountOrigin = await accountModel.findOne({ conta: contaOrigem });
    const accountDestiny = await accountModel.findOne({ conta: contaDestino });

    if (!accountOrigin) {
      res.status(404).send({ message: "Conta de origem inexistente!" });
      return;
    }
    if (!accountDestiny) {
      res.status(404).send({ message: "Conta de destino inexistente!" });
      return;
    }

    const filterOrigin = { _id: accountOrigin._id };
    let updateOrigin = 0;
    if (accountOrigin.agencia != accountDestiny.agencia) {
      updateOrigin = { balance: accountOrigin.balance - valor - tarifa };
    } else {
      updateOrigin = { balance: accountOrigin.balance - valor };
    }

    const filterDestiny = { _id: accountDestiny._id };
    const updateDestiny = { balance: accountDestiny.balance + valor };

    if (updateOrigin.balance < 0) {
      res
        .status(404)
        .send({ message: "Saldo para transferência insuficiente!" });
      return;
    }

    const accountOriginUpdated = await accountModel.findOneAndUpdate(
      filterOrigin,
      updateOrigin,
      { new: true }
    );

    const accountDestinyUpdated = await accountModel.findOneAndUpdate(
      filterDestiny,
      updateDestiny,
      { new: true }
    );

    res.send({ balance: accountOriginUpdated.balance });
  } catch (error) {
    res.status(500).send(error);
  }
});

router.get("/average", async (req, res) => {
  const { agencia } = req.body;

  const filterMatch = { agencia: Number(agencia) };
  const filterGroup = { _id: "$agencia", avg: { $avg: "$balance" } };
  try {
    let docs = await accountModel.aggregate([
      { $match: filterMatch },
      { $group: filterGroup },
    ]);

    if (docs.length == 0) {
      res.status(404).send({ message: "Agencia não encontrada!" });
      return;
    }
    res.send({ average: docs[0].avg });
  } catch (error) {
    res.status(500).send(error);
  }
});

router.get("/lowestbalance", async (req, res) => {
  const { count } = req.body;
  try {
    const accounts = await accountModel
      .find({}, { _id: 1, agencia: 1, name: 1, conta: 1, balance: 1 })
      .sort({ balance: 1 })
      .limit(count);

    res.send(accounts);
  } catch (error) {
    res.status(500).send(error);
  }
});

router.get("/highestbalance", async (req, res) => {
  const { count } = req.body;
  try {
    const accounts = await accountModel
      .find({}, { _id: 1, agencia: 1, name: 1, conta: 1, balance: 1 })
      .sort({ balance: -1 })
      .limit(count);

    res.send(accounts);
  } catch (error) {
    res.status(500).send(error);
  }
});

router.patch("/private", async (req, res) => {
  try {
    let agencies = await accountModel.find().distinct("agencia");

    // agencies.map(async (agency) => {
    //   let account = await accountModel
    //     .find({ agencia: agency }, { _id: 1, name: 1 })
    //     .sort({ balance: -1 })
    //     .limit(1);

    //   const filter = { _id: account[0]._id };
    //   const update = { agencia: 99 };

    //   await accountModel.updateOne(filter, update);
    // });

    for (const agency of agencies) {
      let account = await accountModel
        .find({ agencia: agency }, { _id: 1, name: 1 })
        .sort({ balance: -1 })
        .limit(1);

      const filter = { _id: account[0]._id };
      const update = { agencia: 99 };

      await accountModel.updateOne(filter, update);
    }

    const accounts = await accountModel.find({ agencia: 99 });
    res.send(accounts);
  } catch (error) {
    res.status(500).send(error);
  }
});

router.get("/privates", async (req, res) => {
  try {
    const accounts = await accountModel.find({ agencia: 99 });
    if (accounts.length == 0) {
      res.status(404).send({ message: "Agencia 99 inexistente!" });
    } else {
      res.send(accounts);
    }
  } catch (error) {
    res.status(500).send(error);
  }
});

export default router;
