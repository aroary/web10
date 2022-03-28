from datetime import datetime, timedelta
from fastapi import FastAPI, Request, status
from passlib.context import CryptContext
from fastapi.middleware.cors import CORSMiddleware
import requests
import jwt

import app.settings as settings
import app.docs as docs
import app.models as models
import app.mongo as mongo
import app.exceptions as exceptions
import app.twilio as twilio
#############################################
########### APP INITIALIZATION ##############
#############################################
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
app = FastAPI(
    title="web10",
    openapi_tags=docs.tags_metadata,
    description=docs.description,
    version="10.0.0.0",
    terms_of_service="http://example.com/terms/",
)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

####################################################
################## Handle 422s #####################
####################################################

import logging
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    exc_str = f"{exc}".replace("\n", " ").replace("   ", " ")
    logging.error(f"{request}: {exc_str}")
    content = {"status_code": 10422, "message": exc_str, "data": None}
    return JSONResponse(
        content=content, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY
    )


####################################################
########### User Password Authentication ###########
####################################################
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


def authenticate_user(username: str, password: str):
    user = mongo.get_user(username)
    if not user:
        raise exceptions.LOGIN
    if not verify_password(password, user.hashed_password):
        raise exceptions.LOGIN
    return user


##################################################
########### Token Based Authentication ###########
##################################################
def decode_token(token: str, private_key=False) -> models.TokenData:
    if private_key:
        payload = jwt.decode(
            token, settings.PRIVATE_KEY, algorithms=[settings.ALGORITHM]
        )
    else:
        payload = jwt.decode(token, verify=False)
    token_data = models.TokenData()
    token_data.populate_from_payload(payload)
    return token_data


# check if a token can be minted given a submitted token
def can_mint(submission_token, mint_token):
    # TODO CHECK FOR PROTOCOL
    if submission_token.username == mint_token.username:
        pass
    else:
        raise exceptions.MINT
    if not submission_token.site:
        raise exceptions.MINT
    elif submission_token.site in settings.CORS_SERVICE_MANAGERS:
        pass
    elif submission_token.site == mint_token.site:
        pass
    else:
        raise exceptions.MINT

    if submission_token.provider == settings.PROVIDER:
        if submission_token.provider == mint_token.provider:
            pass
    else:
        raise exceptions.MINT

    return True


# certify a web10 token with a remote provider
def certify_with_remote_provider(token: models.Token):
    decoded = decode_token(token.token)
    url = f"{decoded.provider}/certify"
    response = requests.post(url, json=token.json())
    return response.status_code == 200


# checks if :
# a token certifies with it's provider, is targetted to this provider, is cross origin approved, and whitelisted
def is_permitted(token: models.Token, username, service, action):
    # TODO ADD WHITELIST AND BLACKLISING
    decoded = decode_token(token.token)
    if settings.PROVIDER == decoded.provider:
        certified = certify(token)
    else:
        certified = certify_with_remote_provider(token)

    if certified:
        decoded = models.dotdict(jwt.decode(token.token, verify=False))
        if not decoded.target:
            if decoded.username == username and decoded.provider == settings.PROVIDER:
                return True
            else:
                return False
        elif decoded.target != settings.PROVIDER:
            return False
        if decoded.site in settings.CORS_SERVICE_MANAGERS or mongo.is_in_cross_origins(
            decoded.site, username, service
        ):
            if mongo.get_approved(
                decoded.username, decoded.provider, username, service, action
            ):
                return True
    return False


##############################################
############ Web10 Routes For You ############
##############################################

# check that an email verification code is valid
@app.post("/verify_code")
async def verify_code(token: models.Token):
    decoded = decode_token(token.token)
    email = mongo.fetch_email(decoded.username)
    if not email:
        raise exceptions.EMAIL_MISSING
    code = token.query["code"]
    res = twilio.check_verification(email,code)
    print(res)
    mongo.set_verified(decoded.username)
    return res

# mail an email verification code
@app.post("/send_code")
async def send_code(token: models.Token):
    decoded = decode_token(token.token)
    email = mongo.fetch_email(decoded.username)
    return twilio.send_verification(email,decoded.username)

# check that a token is a valid non expired token written by this web10 server.
@app.post("/certify")
async def certify_token(token: models.Token):
    return certify(token)


def certify(token: models.Token):
    try:
        token_data = decode_token(token.token, private_key=True)
        if token_data.provider != settings.PROVIDER:
            raise exceptions.TOKEN
        if token_data.username is None:
            raise exceptions.TOKEN
        if datetime.utcnow() > datetime.fromisoformat(token_data.expires):
            raise exceptions.TOKEN
    except:
        raise exceptions.TOKEN
    return True


# make a web10 token via. user password flow, or via. submitted token
@app.post("/web10token", response_model=models.Token)
async def create_web10_token(form_data: models.TokenForm):
    token_data = models.TokenData()
    token_data.populate_from_token_form(form_data)
    if (not form_data.password) and (not form_data.token):
        raise exceptions.LOGIN
    try:
        if form_data.password:
            if authenticate_user(form_data.username, form_data.password):
                if form_data.site in settings.CORS_SERVICE_MANAGERS:
                    pass
        elif form_data.token:
            if certify(models.Token(token=form_data.token)):
                if can_mint(decode_token(form_data.token), token_data):
                    pass
    except Exception as e:
        raise e
    token_data.expires = (
        datetime.utcnow() + timedelta(minutes=settings.TOKEN_EXPIRE_MINUTES)
    ).isoformat()
    token_data.provider = settings.PROVIDER
    return {
        "token": jwt.encode(
            token_data.dict(), settings.PRIVATE_KEY, algorithm=settings.ALGORITHM
        )
    }


def kosher(s):
    return "/" not in s and "." not in s and "$" not in s


# make a new web10 account
@app.post("/signup")
async def signup(form_data: models.SignUpForm):
    form_data = models.dotdict(form_data)
    if not kosher(form_data.username):
        raise exceptions.BAD_USERNAME
    if form_data.betacode != settings.BETA_CODE:
        raise exceptions.BETA
    return mongo.create_user(form_data, get_password_hash)

# make a new web10 account
@app.post("/change_pass")
async def change_pass(form_data: models.SignUpForm):
    if authenticate_user(form_data.username, form_data.password):
        return mongo.change_pass(form_data.username,form_data.new_pass,get_password_hash)
    raise exceptions.LOGIN

#####################################################
############ Web10 Routes Managed By You ############
#####################################################
def check_can_afford(user):
    if not mongo.has_credits(user):
        if mongo.should_replenish(user):
            mongo.replenish(user)
        else :
            raise exceptions.TIME
    if not mongo.has_space(user):
        raise exceptions.SPACE
    return True

def check_verified(user):
    if settings.NEED_TO_VERIFY and not mongo.is_verified(user):
        raise exceptions.VERIFY
    return True
def charge(resp,user,action):
    mongo.decrement(user,action)
    return resp

@app.post("/{user}/{service}", tags=["web10"])
async def create_records(user, service, token: models.Token):
    if not is_permitted(token, user, service, "create"):
        raise exceptions.CRUD
    check_can_afford(user) and check_verified(user)
    return charge(mongo.create(user, service, token.query),user,"create")


# web10 uses patch for get in CRUD since get requests can't have a secure body
@app.patch("/{user}/{service}", tags=["web10"])
async def read_records(user, service, token: models.Token):
    if not is_permitted(token, user, service, "read"):
        raise exceptions.CRUD
    if service != "services" : check_can_afford(user) and check_verified(user)
    if token.query==None:token.query={}
    res = mongo.read(user, service, token.query)
    # dont charge for "services"
    if service =="services": return res
    return charge(res,user,"read")


@app.put("/{user}/{service}", tags=["web10"])
async def update_records(user, service, token: models.Token):
    if not is_permitted(token, user, service, "update"):
        raise exceptions.CRUD
    check_can_afford(user) and check_verified(user)
    return charge(mongo.update(user, service, token.query, token.update),user,"update")


@app.delete("/{user}/{service}", tags=["web10"])
async def delete_records(user, service, token: models.Token):
    if not is_permitted(token, user, service, "delete"):
        raise exceptions.CRUD
    if service != "services" : check_can_afford(user) and check_verified(user)
    res = mongo.delete(user, service, token.query)
    # dont charge for "services"
    if service =="services": return res
    return charge(res,user,"delete")

