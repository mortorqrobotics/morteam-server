"use strict";

module.exports = function(imports) {

    let User = imports.models.User;
    let Group = imports.models.Group;

    let middlechecker = {};

    middlechecker.checkBody = (pattern) => (req, res, next) => {
        if (!pattern) {
            return next();
        }
        let input = req.method === "GET" || req.method === "DELETE"
            ? req.query
            : req.body;
        if (typecheck(pattern, input)) {
            next();
        } else {
            handleTypeError(req, res);
        }
    };

    let types = middlechecker.types = {
        integer: (obj) => {
            return typeof obj === "number" && obj % 1 === 0;
        },
        float: (obj) => {
            return typeof obj === "number";
        },
        string: (obj) => {
            return typeof obj === "string";
        },
        boolean: (obj) => {
            return typeof obj === "boolean";
        },
        objectId: (Model) => (obj) => {
            // Model is ignored
            // same as string, but more descriptive
            // maybe it should have some extra functionality
            // cannot check for existence here
            return typeof obj === "string";
        },
        any: (obj) => {
            return true;
        },
        maybe: (model) => (obj) => {
            return typeof obj === "undefined" || typecheck(model, obj);
        },
        value: (value) => (obj) => {
            return obj === value;
        },
        enum: (options) => (obj) => {
            return options.indexOf(obj) !== -1;
        },
        union: (models) => (obj) => {
            return models.some(model => typecheck(model, obj));
        },
    };

    types.audience = {
        users: [types.objectId(User)],
        groups: [types.objectId(Group)],
    };
    types.attendance = [{
        user: middlechecker.types.objectId(User),
        status: middlechecker.types.enum(["present", "absent", "tardy", "excused"]),

    }];

    return middlechecker;

}

function handleTypeError(req, res) {
    res.status(400).end("Invalid request");
}

function typecheck(model, obj) {
    if (typeof model === "object") {
        if (Array.isArray(model)) {
            return Array.isArray(obj) && obj.every(x => typecheck(model[0], x));
        } else {
            return typeof obj === "object"
                && Object.keys(model).every(key => typecheck(model[key], obj[key]));
        }
    } else {
        return model(obj);
    }
}
