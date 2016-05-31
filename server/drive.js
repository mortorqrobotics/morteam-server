"use strict";

module.exports = function(imports) {

	let express = imports.modules.express;
	let ObjectId = imports.modules.mongoose.Types.ObjectId;
	let multer = imports.modules.multer;
	let extToMime = require("./extToMime.json");
	let lwip = imports.modules.lwip;
	let Promise = imports.modules.Promise;
	let https = require("https");
	let util = imports.util;

	let requireLogin = util.requireLogin;
	let requireAdmin = util.requireAdmin;

	let Folder = imports.models.Folder;
	let File = imports.models.File;

	let router = express.Router();

	router.get("/file/:fileId", requireLogin, Promise.coroutine(function*(req, res) {
		let userSubdivisionIds = util.activeSubdivisionIds(req.user.subdivisions);
		try {

			if (req.params.fileId.indexOf("-preview") == -1) {
				
				let file = yield File.findOne({_id: req.params.fileId}).populate("folder").exec();
				
				if (!file) {
					return res.end("fail");
				}

				if (!( (file.folder.team == req.user.current_team.id && file.folder.entireTeam)
					|| file.folder.userMembers.indexOf(req.user._id) > -1
					|| file.folder.subdivisionMembers.hasAnythingFrom(userSubdivisionIds) )) {
				
					return res.end("restricted");
				}
			}

			let url = yield util.driveBucket.getSignedUrlAsync("getObject", { Key: req.params.fileId, Expires: 60 });
			// res.redirect(url); do not use this
			// this caused a security flaw
			// the S3 key was included in the url and sent to the user
			https.get(url, function(response) {
				response.pipe(res);
			});
		
		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	router.get("/folders/team", requireLogin, Promise.coroutine(function*(req, res) {
		let userSubdivisionIds = util.activeSubdivisionIds(req.user.subdivisions);
		try {

			let folders = yield Folder.find({
				team: req.user.current_team.id,
				parentFolder: { "$exists": false },
				$or: [
					{entireTeam: true},
					{userMembers: req.user._id},
					{subdivisionMembers: {"$in": userSubdivisionIds} }
				]
			});

			res.json(folders);

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	router.get("/folders/:folderId/subfolders", requireLogin, Promise.coroutine(function*(req, res) {
		let userSubdivisionIds = util.activeSubdivisionIds(req.user.subdivisions);
		try {

			let folders = yield Folder.find({
				team: req.user.current_team.id,
				parentFolder: req.params.folderId, $or: [
					{entireTeam: true},
					{userMembers: req.user._id},
					{subdivisionMembers: {"$in": userSubdivisionIds} }
				]
			});

			res.json(folders);

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	router.get("/folder/:folderId/files", requireLogin, Promise.coroutine(function*(req, res) {
		try {

			let files = yield File.find({ folder: req.params.folderId });

			res.json(files);

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	router.post("/folders", requireLogin, Promise.coroutine(function*(req, res) {

		if (req.body.name.length >= 22) {
			return res.end("fail");
		}

		if (req.body.type != "teamFolder" && req.body.type != "subFolder") {
			return res.end("fail");
		}

		try {

			let folder = {
				name: util.normalizeDisplayedText(req.body.name),
				team: req.user.current_team.id,
				userMembers: req.body.userMembers,
				subdivisionMembers: req.body.subdivisionMembers,
				creator: req.user._id,
				defaultFolder: false
			};

			if (req.body.type == "teamFolder") {
				folder.parentFolder = undefined;
				folder.ancestors = [];
			} else if (req.body.type == "subFolder") {
				folder.parentFolder = req.body.parentFolder;
				folder.ancestors = req.body.ancestors.concat([req.body.parentFolder]);
			}

			folder = yield Folder.create(folder);

			res.json(folder);

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	router.post("/files/upload", requireLogin, multer({
		limits: 50 * 1000000 // 50 megabytes
	}).single("uploadedFile"), Promise.coroutine(function*(req, res) {

		let ext = req.file.originalname.substring(req.file.originalname.lastIndexOf(".") + 1).toLowerCase() || "unknown";

		let mime = extToMime[ext];
		let disposition;

		if (mime == undefined) {
			disposition = "attachment; filename="+req.file.originalname;
			mime = "application/octet-stream";
		} else {
			disposition = "attachment; filename="+req.body.fileName+"."+ext;
		}

		req.body.fileName = util.normalizeDisplayedText(req.body.fileName);

		try {

			let file = yield File.create({
				name: req.body.fileName,
				originalName: req.file.originalname,
				folder: req.body.currentFolderId,
				size: req.file.size,
				type: util.extToType(ext),
				mimetype: mime,
				creator: req.user._id
			});

			yield util.uploadToDriveAsync(req.file.buffer, file._id, mime, disposition);
			
			if (file.type == "image") {
			
				let image = yield lwip.openAsync(req.file.buffer, ext);

				Promise.promisifyAll(image);

				let hToWRatio = image.height() / image.width();
				if (hToWRatio >= 1) {
					image = yield image.resizeAsync(280, 280 * hToWRatio);
				} else {
					image = yield image.resizeAsync(280 / hToWRatio, 280);
				}

				Promise.promisifyAll(image);
				let buffer = yield image.toBufferAsync(ext);

				util.uploadToDriveAsync(buffer, file._id + "-preview", mime, disposition);
			}

			res.end(JSON.stringify(file));

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	router.delete("/files/:fileId", requireLogin, Promise.coroutine(function*(req, res) {
		try {

			let file = yield File.findOne({ _id: req.params.fileId }).populate("folder").exec();

			if (req.user._id.toString() != file.creator.toString()
					&& !( req.user.current_team.position == "admin"
					&& (file.folder.team == req.user.current_team.id))) {
				return res.end("fail");
			}

			yield util.deleteFileFromDriveAsync(req.params.fileId);
			
			yield file.remove();
			
			// TODO: this should not be passed by the client, it should be found by the server
			if (req.query.isImg == "true") {
				yield util.deleteFileFromDriveAsync(req.params.fileId + "-preview");
			}

			res.end("success");

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	return router;

};
